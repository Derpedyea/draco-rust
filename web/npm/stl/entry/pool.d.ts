import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The stl package's work on workers; each method resolves with what the
 * function it names returns. */
export interface StlPool extends Pool {
  /** Reads an STL file, as `read_stl`. */
  read(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes a mesh as STL, as `write_stl`. */
  write(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): StlPool;
