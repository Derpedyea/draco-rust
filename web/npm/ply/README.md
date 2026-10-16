# @draco-rust/ply

Reads and writes PLY in WebAssembly: meshes and point clouds, in ASCII and
binary. Every property is kept: the ones it has no attribute for come back by
name, so a Gaussian splat arrives with its scales, rotations, opacity and
spherical harmonics. It is part of
[draco-rust](https://github.com/Filyus/draco-rust) and drives the
[converter](https://filyus.github.io/draco-rust/).

~89 KiB gzip.

## Usage

```js
import init, { parse_ply_bytes, create_ply } from "@draco-rust/ply";

await init();
const result = parse_ply_bytes(plyBytes);
if (!result.success) throw new Error(result.error);
const { positions, indices, normals, colors, extras } = result.meshes[0];
// indices is empty for a point cloud; extras holds the other properties
```

`create_ply(mesh, { format })` writes one back: binary little-endian by
default, as a `Uint8Array` in `binary_data`; `format: "binary_big_endian"`
does the same, and `format: "ascii"` returns text in `data`.

## On workers

A large file blocks the calling thread while it is read or written.
`@draco-rust/ply/pool` runs the same functions on workers:

```js
import { createPool } from "@draco-rust/ply/pool";

const pool = createPool({ workers: 2 }); // default: cores - 1, at most 4
const result = await pool.parse(bytes); // what parse_ply_bytes returns
const written = await pool.create(mesh, {}); // what create_ply returns
pool.dispose();
```

`parse` runs `parse_ply_bytes` and `create` runs `create_ply`.

The workers start as work arrives, and the wasm is compiled once for all of
them. Inputs are copied to the worker, or handed over with `{ transfer: true }`;
`{ signal }` takes an `AbortSignal`, which rejects the promise at once. A task
a worker has started still runs to its end and its result is dropped. With
`workers: 0`, or where there are no workers, the pool runs on the calling
thread. It works on Web Workers, Node's worker threads (Node 20.16 and later)
and from a CDN, as the decoder's does.

For loading from a CDN or in Node, see the
[decoder's README](https://www.npmjs.com/package/@draco-rust/decoder); the same
`init` options apply, with `@draco-rust/ply/index_bg.wasm` as the file.

Licensed under Apache-2.0.
