export interface PoolOptions {
  /**
   * How many workers to run at most; they start as work arrives. Defaults to
   * one less than the cores, between one and four. `0` runs on the calling
   * thread, as does an environment without workers.
   */
  workers?: number;
  /**
   * The entry's wasm, when it is not next to this module where the pool looks
   * for it: a URL, a `Response`, the bytes, or a compiled module.
   */
  wasm?: string | URL | Response | BufferSource | WebAssembly.Module;
}

export interface TaskOptions {
  /**
   * Hand the input's buffers to the worker instead of copying them, leaving
   * them detached here. For buffers nothing else reads afterwards.
   */
  transfer?: boolean;
  /**
   * Abandons the task: the promise rejects with the signal's reason at once.
   * A task a worker has already started still runs to its end, and its result
   * is dropped; one not yet sent is never sent.
   */
  signal?: AbortSignal;
}

export interface Pool {
  /** Compiles the wasm and starts one worker ahead of the first task. */
  preload(): Promise<void>;
  /** Changes the worker limit; idle workers past it stop now, busy ones when done. */
  setWorkerLimit(workers: number): void;
  readonly workerLimit: number;
  /** Stops every worker and rejects what they held. */
  dispose(): void;
}

export interface TaskPool extends Pool {
  /** Runs the task `tasks.js` exports under `name` on a worker. */
  run(name: string, args?: unknown[], options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): TaskPool;
