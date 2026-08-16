# Imprun Application SDK

`@imprun/app-sdk` is the optional public TypeScript authoring SDK for Windforce
Apps. It provides typed Action definitions, App-local dispatch, structural Core
context types, and App-owned manifest/schema generation.

It is not a Core client, Worker, launcher, or replacement for
`windforce-client`. Windforce Core remains responsible for admission,
scheduling, execution, authorization, masking, cancellation, and completion.

## Define an App

```ts
import { defineAction, defineApp } from "@imprun/app-sdk";

const publish = defineAction<"post.publish", { title: string }, { id: string }>({
  name: "post.publish",
  inputSchema: {
    schema: {
      type: "object",
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  },
  runtimeAccess: {
    variables: [{ scope: "app", path: "connections/default/session" }],
  },
  handler: async (ctx) => ({ id: ctx.input.title }),
});

export const app = defineApp({
  name: "publication",
  entrypoint: "src/main.ts",
  actions: [publish],
});

export const main = app.main;
```

## Generate the canonical deployment artifact

Generation belongs to the App build, not to Core:

```ts
import { writeAppArtifacts } from "@imprun/app-sdk/node";
import { app } from "../src/main.js";

await writeAppArtifacts(app);
```

Inline JSON Schemas are written below `schemas/`. Existing schema files can be
referenced with `{ path: "schemas/input.schema.json" }`.

The manifest filename precedence is:

1. explicit `manifestFile` builder option;
2. `WINDFORCE_CORE_MANIFEST_FILE`;
3. `windforce.json`.

Changing the filename does not change the manifest schema. Whether generated
artifacts are committed, emitted into build output, or promoted to a separate
deployment repository remains an App delivery decision.

See [Core compatibility](docs/compatibility.md) for the structural ABI and
conformance snapshot verified by this release line.

## Development

```text
npm install
npm run check
npm run build
npm pack --dry-run
```

The package is Apache-2.0 licensed. npm registry publication is intentionally
separate from repository integration; consumers may pin an exact public Git
commit in the meantime.
