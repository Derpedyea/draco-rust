# @draco-rust/stl

Reads and writes binary and ASCII STL in WebAssembly. Which kind a
file is follows from its length, not from a leading `solid`, which binary
exporters often write too. It is part of
[draco-rust](https://github.com/Filyus/draco-rust) and drives the
[converter](https://filyus.github.io/draco-rust/).

~48 KiB gzip.

## Usage

```js
import init, { parse_stl_bytes, create_stl } from "@draco-rust/stl";

await init();
const result = parse_stl_bytes(stlBytes);
if (!result.success) throw new Error(result.error);
const { positions, indices, normals } = result.meshes[0];

const written = create_stl({ positions, indices }, {});   // binary by default
const stl = written.binary_data; // Uint8Array; with { format: "ascii" }, text in written.data
```

Meshes keep STL's own shape: three vertices per triangle, each with the facet
normal, so a cube reads as 36 vertices rather than 24.

## On workers

A large file blocks the calling thread while it is read or written.
`@draco-rust/stl/pool` runs the same functions on workers:

```js
import { createPool } from "@draco-rust/stl/pool";

const pool = createPool({ workers: 2 }); // default: cores - 1, at most 4
const result = await pool.parse(bytes); // what parse_stl_bytes returns
const written = await pool.create(mesh, {}); // what create_stl returns
pool.dispose();
```

`parse` runs `parse_stl_bytes` and `create` runs `create_stl`.

The workers start as work arrives, and the wasm is compiled once for all of
them. Inputs are copied to the worker, or handed over with `{ transfer: true }`;
`{ signal }` takes an `AbortSignal`, which rejects the promise at once. A task
a worker has started still runs to its end and its result is dropped. With
`workers: 0`, or where there are no workers, the pool runs on the calling
thread. It works on Web Workers, Node's worker threads (Node 20.16 and later)
and from a CDN, as the decoder's does.

For loading from a CDN or in Node, see the
[decoder's README](https://www.npmjs.com/package/@draco-rust/decoder); the same
`init` options apply, with `@draco-rust/stl/index_bg.wasm` as the file.

Licensed under Apache-2.0.
