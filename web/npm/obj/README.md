# @draco-rust/obj

Reads and writes Wavefront OBJ in WebAssembly: positions, normals, texture
coordinates, groups and material references. It is part of
[draco-rust](https://github.com/Filyus/draco-rust) and drives the
[converter](https://filyus.github.io/draco-rust/).

~42 KiB gzip.

## Usage

```js
import init, { parse_obj_bytes, create_obj } from "@draco-rust/obj";

await init();
const result = parse_obj_bytes(objBytes);
if (!result.success) throw new Error(result.error);
const { positions, indices, normals, uvs } = result.meshes[0];

const written = create_obj({ positions, indices, normals, uvs }, {});
const obj = written.data; // the OBJ text
```

Polygons are triangulated. `create_obj_multi` writes several meshes into one
file.

## On workers

A large file blocks the calling thread while it is read or written.
`@draco-rust/obj/pool` runs the same functions on workers:

```js
import { createPool } from "@draco-rust/obj/pool";

const pool = createPool({ workers: 2 }); // default: cores - 1, at most 4
const result = await pool.parse(bytes); // what parse_obj_bytes returns
const written = await pool.create(mesh, {}); // what create_obj returns
pool.dispose();
```

`parse` runs `parse_obj_bytes`, `create` runs `create_obj`, and `createMulti`
runs `create_obj_multi`.

The workers start as work arrives, and the wasm is compiled once for all of
them. Inputs are copied to the worker, or handed over with `{ transfer: true }`;
`{ signal }` takes an `AbortSignal`, which rejects the promise at once. A task
a worker has started still runs to its end and its result is dropped. With
`workers: 0`, or where there are no workers, the pool runs on the calling
thread. It works on Web Workers, Node's worker threads (Node 20.16 and later)
and from a CDN, as the decoder's does.

For loading from a CDN or in Node, see the
[decoder's README](https://www.npmjs.com/package/@draco-rust/decoder); the same
`init` options apply, with `@draco-rust/obj/index_bg.wasm` as the file.

Licensed under Apache-2.0.
