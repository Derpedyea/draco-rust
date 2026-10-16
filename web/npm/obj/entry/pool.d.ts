import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The obj package's work on workers; each method resolves with what the
 * function it names returns. */
export interface ObjPool extends Pool {
  /** Reads an OBJ file, as `read_obj`. */
  read(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes one mesh or several as OBJ, as `write_obj`. */
  write(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): ObjPool;
