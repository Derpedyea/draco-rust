// A pool worker. The pool sends it the compiled module once, then tasks by
// name from this entry's `tasks.js`; it answers each with its result, handing
// every array in it back by transfer. Runs as a Web Worker and as a Node
// worker thread.
import init from './index.js';
import * as tasks from './tasks.js';

const web = typeof self !== 'undefined' && typeof self.postMessage === 'function';
const port = web ? self : process.getBuiltinModule('node:worker_threads').parentPort;
const listen = (handler) =>
  web ? self.addEventListener('message', (event) => handler(event.data)) : port.on('message', handler);

let ready = null;

/** Every buffer in a result, except the module's own memory, which stays. */
function buffersOf(value, memory, found = new Set()) {
  if (ArrayBuffer.isView(value)) {
    if (value.buffer instanceof ArrayBuffer && value.buffer !== memory) found.add(value.buffer);
  } else if (value instanceof ArrayBuffer) {
    if (value !== memory) found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) buffersOf(item, memory, found);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) buffersOf(item, memory, found);
  }
  return found;
}

listen(async (message) => {
  if (message.type === 'init') {
    ready = init({ module_or_path: message.module });
    return;
  }
  const { id, task, args } = message;
  try {
    const { memory } = await ready;
    const result = await tasks[task](...args);
    port.postMessage({ id, result }, [...buffersOf(result, memory.buffer)]);
  } catch (error) {
    port.postMessage({ id, error: String(error?.message ?? error) });
  }
});
