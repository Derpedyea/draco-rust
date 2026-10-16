// Work off the calling thread: a pool of workers, each running this entry's
// own module and the tasks its `tasks.js` names. The wasm is compiled once here
// and handed to every worker; inputs go over by transfer of a copy, or of the
// caller's own buffers when asked, and results come back by transfer, so a
// task copies nothing it does not have to.
import init from './index.js';
import * as tasks from './tasks.js';

/** Leaves a core for the page, and stops at four, past which a page rarely has
 * that many files in flight at once. */
const defaultWorkers = () =>
  Math.max(1, Math.min(4, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1));

const builtin = (name) =>
  typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function'
    ? process.getBuiltinModule(name)
    : undefined;

async function compile(wasm) {
  if (wasm instanceof WebAssembly.Module) return wasm;
  let source = wasm ?? new URL('./index_bg.wasm', import.meta.url);
  if (typeof source === 'string' || source instanceof URL) {
    const url = new URL(source, import.meta.url);
    // Node's fetch does not read files.
    const fs = url.protocol === 'file:' ? builtin('node:fs/promises') : undefined;
    if (fs) return WebAssembly.compile(await fs.readFile(url));
    source = await fetch(url);
  }
  if (typeof Response !== 'undefined' && source instanceof Response) {
    if (!source.ok) throw new Error(`failed to fetch ${source.url}: ${source.status}`);
    if (source.headers.get('content-type') === 'application/wasm') {
      return WebAssembly.compileStreaming(source);
    }
    source = await source.arrayBuffer();
  }
  return WebAssembly.compile(source);
}

/** What the pool needs of a worker, the same over a Web Worker and a Node
 * worker thread. */
function spawn(blobUrl) {
  if (typeof Worker === 'function') {
    const url = new URL('./worker.js', import.meta.url);
    // A bundler recognises this exact form and emits the worker as a chunk.
    const worker =
      typeof location === 'undefined' || url.origin === location.origin
        ? new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
        : new Worker(blobUrl(url), { type: 'module' });
    return {
      post: (message, transfer) => worker.postMessage(message, transfer),
      listen: (onMessage, onError) => {
        worker.addEventListener('message', (event) => onMessage(event.data));
        worker.addEventListener('error', (event) => {
          event.preventDefault();
          onError(new Error(event.message || 'the worker failed'));
        });
        worker.addEventListener('messageerror', () => onError(new Error('a result could not be read')));
      },
      busy: () => {},
      terminate: () => worker.terminate(),
    };
  }
  const threads = builtin('node:worker_threads');
  if (!threads) return null;
  const worker = new threads.Worker(new URL('./worker.js', import.meta.url));
  // An idle worker does not keep Node running; one with work does.
  worker.unref();
  return {
    post: (message, transfer) => worker.postMessage(message, transfer),
    listen: (onMessage, onError) => {
      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.on('exit', (code) => onError(new Error(`the worker exited with code ${code}`)));
    },
    busy: (busy) => (busy ? worker.ref() : worker.unref()),
    terminate: () => worker.terminate(),
  };
}

const workersAvailable = () =>
  typeof Worker === 'function' || builtin('node:worker_threads') !== undefined;

const isPlain = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * The arguments as they go to a worker, and the buffers that go with them.
 * Without `transfer` every typed array is copied first -- just its own bytes,
 * where structured cloning would copy the whole buffer behind a view -- and
 * the copy is what moves; with it the caller's buffers move and are left
 * detached.
 */
function outgoing(args, transfer) {
  const buffers = new Set();
  const visit = (value) => {
    if (ArrayBuffer.isView(value)) {
      const view = transfer ? value : value.slice();
      if (!(view.buffer instanceof ArrayBuffer)) return view;
      buffers.add(view.buffer);
      return view;
    }
    if (value instanceof ArrayBuffer) {
      const buffer = transfer ? value : value.slice(0);
      buffers.add(buffer);
      return buffer;
    }
    if (Array.isArray(value)) return value.map(visit);
    if (isPlain(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    return value;
  };
  const sent = args.map(visit);
  return { sent, buffers: [...buffers] };
}

const aborted = (signal) => signal.reason ?? new DOMException('The task was aborted', 'AbortError');

export function createPool(options = {}) {
  let limit = options.workers ?? defaultWorkers();
  let compiled = null;
  let local = null;
  let blob = null;
  let disposed = false;
  let nextId = 0;
  const slots = [];

  const load = () => (compiled ??= compile(options.wasm));
  // A worker script must share the page's origin. From a CDN, a worker made
  // here imports it instead, which a module worker may do across origins.
  const blobUrl = (url) =>
    (blob ??= URL.createObjectURL(
      new Blob([`import ${JSON.stringify(url.href)};`], { type: 'text/javascript' }),
    ));

  function retire(slot, error) {
    const at = slots.indexOf(slot);
    if (at >= 0) slots.splice(at, 1);
    slot.worker.terminate();
    for (const { reject } of slot.pending.values()) reject(error);
    slot.pending.clear();
  }

  function open(module) {
    const worker = spawn(blobUrl);
    if (!worker) return null;
    const slot = { worker, pending: new Map() };
    worker.listen(
      (message) => {
        const task = slot.pending.get(message.id);
        if (!task) return;
        slot.pending.delete(message.id);
        if (slot.pending.size === 0) {
          worker.busy(false);
          if (slots.indexOf(slot) >= limit) retire(slot);
        }
        if ('error' in message) task.reject(new Error(message.error));
        else task.resolve(message.result);
      },
      // A worker that fails takes only its own tasks down; the next task
      // starts another.
      (error) => {
        if (slots.includes(slot)) retire(slot, error);
      },
    );
    worker.post({ type: 'init', module });
    slots.push(slot);
    return slot;
  }

  /** The least loaded worker, or a new one while every worker is busy and
   * the limit allows another. */
  function pick(module) {
    let best = null;
    for (const slot of slots.slice(0, limit)) {
      if (!best || slot.pending.size < best.pending.size) best = slot;
    }
    if ((!best || best.pending.size > 0) && slots.length < limit) return open(module) ?? best;
    return best;
  }

  const onThisThread = () =>
    (local ??= load().then((module) => init({ module_or_path: module })));

  async function run(name, args = [], { transfer = false, signal } = {}) {
    if (disposed) throw new Error('the pool was disposed');
    if (typeof tasks[name] !== 'function') throw new TypeError(`no task named ${name}`);
    signal?.throwIfAborted();
    if (limit > 0 && workersAvailable()) {
      const module = await load();
      if (disposed) throw new Error('the pool was disposed');
      signal?.throwIfAborted();
      const slot = pick(module);
      if (slot) {
        const id = nextId++;
        const { sent, buffers } = outgoing(args, transfer);
        return new Promise((resolve, reject) => {
          const task = { resolve, reject };
          if (signal) {
            // A task a worker has started runs to its end. Aborting it settles
            // the caller now and drops the result when it comes; the task stays
            // counted against its worker until then, so the load stays true.
            const onAbort = () => {
              task.resolve = task.reject = () => {};
              reject(aborted(signal));
            };
            signal.addEventListener('abort', onAbort, { once: true });
            const settle = (done) => (value) => {
              signal.removeEventListener('abort', onAbort);
              done(value);
            };
            task.resolve = settle(resolve);
            task.reject = settle(reject);
          }
          slot.pending.set(id, task);
          slot.worker.busy(true);
          slot.worker.post({ id, task: name, args: sent }, buffers);
        });
      }
    }
    await onThisThread();
    signal?.throwIfAborted();
    return tasks[name](...args);
  }

  return {
    run,
    async preload() {
      if (limit > 0 && workersAvailable()) {
        const module = await load();
        if (!disposed && slots.length === 0) open(module);
      } else {
        await onThisThread();
      }
    },
    setWorkerLimit(workers) {
      limit = workers;
      for (const slot of slots.slice(limit)) if (slot.pending.size === 0) retire(slot);
    },
    get workerLimit() {
      return limit;
    },
    dispose() {
      disposed = true;
      for (const slot of [...slots]) retire(slot, new Error('the pool was disposed'));
      if (blob) URL.revokeObjectURL(blob);
    },
  };
}
