import type { PoolOptions, TaskOptions, Pool } from './pool-core.js';

export type { PoolOptions, TaskOptions };

/** The fbx package's work on workers; each method resolves with what the
 * function it names returns. */
export interface FbxPool extends Pool {
  /** Reads an FBX file, as `parse_fbx`. */
  parse(data: ArrayBuffer | ArrayBufferView, options?: TaskOptions): Promise<any>;
  /** Writes meshes as FBX, as `create_fbx`. */
  create(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
  /** Writes a scene as FBX, as `create_fbx_scene`. */
  createScene(value: any, writeOptions?: any, options?: TaskOptions): Promise<any>;
}

export function createPool(options?: PoolOptions): FbxPool;
