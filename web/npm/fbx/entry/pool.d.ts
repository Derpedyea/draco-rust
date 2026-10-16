import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The fbx package's work on workers; each method resolves with what the
 * function it names returns. */
export interface FbxPool extends Pool {
  /** Reads an FBX file, as `read_fbx`. */
  read(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes one mesh or several as FBX, as `write_fbx`. */
  write(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
  /** Writes a scene as FBX, as `write_fbx_scene`. */
  writeScene(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): FbxPool;
