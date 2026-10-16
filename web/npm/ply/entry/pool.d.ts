import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The ply package's work on workers; each method resolves with what the
 * function it names returns. */
export interface PlyPool extends Pool {
  /** Reads a PLY file, as `read_ply`. */
  read(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes a mesh or point cloud as PLY, as `write_ply`. */
  write(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): PlyPool;
