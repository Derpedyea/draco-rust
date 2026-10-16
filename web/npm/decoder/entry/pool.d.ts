import type { DracoAttributeRequest, DracoDecodeOptions, DracoDecodeResult } from './index.js';
import type { Pool, PoolOptions, TaskOptions } from './pool-core.js';

export type DecoderPoolOptions = PoolOptions;

export interface DecodeOptions extends DracoDecodeOptions, TaskOptions {}

export interface DecoderPool extends Pool {
  /**
   * `decode_draco` on a worker. A stream that does not decode resolves with
   * `success: false`, as `decode_draco` returns it; a worker that fails rejects
   * the tasks it held.
   */
  decode(
    data: ArrayBuffer | ArrayBufferView,
    attributes?: DracoAttributeRequest[],
    options?: DecodeOptions,
  ): Promise<DracoDecodeResult>;
}

export function createDecoderPool(options?: DecoderPoolOptions): DecoderPool;
export { createDecoderPool as createPool };
