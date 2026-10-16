import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The encoder package's work on workers; each method resolves with what the
 * function it names returns. */
export interface EncoderPool extends Pool {
  /** Encodes a mesh or point cloud to Draco, as `encode_draco`. */
  encode(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): EncoderPool;
