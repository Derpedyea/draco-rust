# @draco-rust/fbx

Reads and writes binary FBX in WebAssembly. It keeps the model tree with its
local transforms, the materials, the skins with their weights, and the morph
targets, rather than a flat list of meshes. It is part of
[draco-rust](https://github.com/Filyus/draco-rust) and is what the
[converter](https://filyus.github.io/draco-rust/) uses to bring FBX into glTF.

~234 KiB gzip.

## Usage

```js
import init, { parse_fbx, create_fbx } from "@draco-rust/fbx";

await init();
const scene = parse_fbx(fbxBytes);
if (!scene.success) throw new Error(scene.error);
console.log(scene.meshes.length, scene.warnings);

const written = create_fbx([{ positions, indices, normals, uvs }], {});
const fbx = written.binary_data; // Uint8Array
```

Compressed FBX arrays (zlib) are read, which every mainstream exporter writes.
ASCII FBX is not supported.

## On workers

A large file blocks the calling thread while it is read or written.
`@draco-rust/fbx/pool` runs the same functions on workers:

```js
import { createPool } from "@draco-rust/fbx/pool";

const pool = createPool({ workers: 2 }); // default: cores - 1, at most 4
const result = await pool.parse(bytes); // what parse_fbx returns
const written = await pool.create(mesh, {}); // what create_fbx returns
pool.dispose();
```

`parse` runs `parse_fbx`, `create` runs `create_fbx`, and `createScene` runs
`create_fbx_scene`.

The workers start as work arrives, and the wasm is compiled once for all of
them. Inputs are copied to the worker, or handed over with `{ transfer: true }`;
`{ signal }` takes an `AbortSignal`, which rejects the promise at once. A task
a worker has started still runs to its end and its result is dropped. With
`workers: 0`, or where there are no workers, the pool runs on the calling
thread. It works on Web Workers, Node's worker threads (Node 20.16 and later)
and from a CDN, as the decoder's does.

For loading from a CDN or in Node, see the
[decoder's README](https://www.npmjs.com/package/@draco-rust/decoder); the same
`init` options apply, with `@draco-rust/fbx/index_bg.wasm` as the file.

Licensed under Apache-2.0.
