// This package's work off the calling thread, on the shared pool.
import { createPool as createTaskPool } from './pool-core.js';

const bytesOf = (data) =>
  ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);

export function createPool(options = {}) {
  const pool = createTaskPool(options);
  return {
    parse: (data, { transfer = false, signal } = {}) => pool.run('parse_ply_bytes', [bytesOf(data)], { transfer, signal }),
    create: (value, writeOptions = {}, { transfer = false, signal } = {}) =>
      pool.run('create_ply', [value, writeOptions], { transfer, signal }),
    preload: () => pool.preload(),
    setWorkerLimit: (workers) => pool.setWorkerLimit(workers),
    get workerLimit() {
      return pool.workerLimit;
    },
    dispose: () => pool.dispose(),
  };
}
