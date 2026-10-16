import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The obj package's work on workers; each method resolves with what the
 * function it names returns. */
export interface ObjPool extends Pool {
  /** Reads an OBJ file, as `parse_obj_bytes`. */
  parse(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes one mesh as OBJ, as `create_obj`. */
  create(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
  /** Writes several meshes into one OBJ, as `create_obj_multi`. */
  createMulti(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): ObjPool;
