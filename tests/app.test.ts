import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defineAction,
  defineApp,
  MANIFEST_FILE_ENV,
  resolveManifestFileName,
  type WindforceContext,
} from "../src/index.js";
import { writeAppArtifacts } from "../src/node.js";

function context(action: string, input: unknown = {}): WindforceContext {
  return {
    input,
    action,
    app: "fixture",
    trigger: { kind: "manual" },
    job: { id: "job-fixture", workspace: "default", tag: "default" },
    actor: { email: "", username: "fixture", permissionedAs: "fixture" },
    telemetry: {},
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    variables: {
      async get() {
        return "";
      },
      async set(path) {
        return { path, revision: 1 };
      },
    },
    resources: {
      async get<T>() {
        return {} as T;
      },
      async set(path) {
        return { path, revision: 1 };
      },
    },
    state: { async get() {}, async set() {} },
    http: { fetch },
    human: {
      async wait() {
        return { taskId: "task", outcome: "cancel" };
      },
    },
    approval: {
      async getResumeUrls() {
        return { approve: "", reject: "", resume_id: 1, step_index: 1, expires_at: 1 };
      },
    },
    flow: {},
  };
}

describe("Application SDK", () => {
  it("dispatches a typed Action through the SDK-neutral main(ctx) interface", async () => {
    const echo = defineAction<"echo", { value: string }, { echoed: string }>({
      name: "echo",
      inputSchema: { schema: { type: "object" } },
      outputSchema: { schema: { type: "object" } },
      handler: async (ctx) => ({ echoed: ctx.input.value }),
    });
    const app = defineApp({ name: "fixture", entrypoint: "src/main.ts", actions: [echo] });
    await expect(app.main(context("echo", { value: "hello" }))).resolves.toEqual({
      echoed: "hello",
    });
    await expect(app.main(context("missing"))).rejects.toThrow("unknown action: missing");
  });

  it("derives exact runtime grants and deterministic schema files", () => {
    const login = defineAction({
      name: "connection.login",
      inputSchema: { schema: { type: "object", additionalProperties: false } },
      outputSchema: { path: "schemas/connection.output.schema.json" },
      runsOn: ["browser", "browser"],
      runtimeAccess: {
        variables: [{ scope: "app", path: "connections/default/session" }],
        writeVariables: [{ scope: "app", path: "connections/default/session", storage: "secret" }],
      },
      async handler() {
        return { ok: true };
      },
    });
    const app = defineApp({
      name: "fixture",
      entrypoint: "src/main.ts",
      timeout: 900,
      actions: [login],
    });
    const artifacts = app.describe();
    expect(artifacts.manifest.actions["connection.login"]).toEqual({
      inputSchema: "schemas/connection.login.input.schema.json",
      outputSchema: "schemas/connection.output.schema.json",
      runsOn: ["browser"],
      runtimeAccess: {
        variables: [{ scope: "app", path: "connections/default/session" }],
        writeVariables: [{ scope: "app", path: "connections/default/session", storage: "secret" }],
      },
    });
    expect(artifacts.files["schemas/connection.login.input.schema.json"]).toContain(
      '"additionalProperties": false',
    );
  });

  it("rejects Workspace runtime writes before publication", () => {
    expect(() =>
      defineAction({
        name: "bad",
        runtimeAccess: {
          writeResources: [{ scope: "workspace", path: "connections/default" }],
        },
        handler() {},
      }),
    ).toThrow("runtime writes require app scope");
  });

  it("rejects values outside the canonical Core key, path, and label grammar", () => {
    expect(() => defineAction({ name: "bad/action", handler() {} })).toThrow("invalid action key");
    expect(() =>
      defineAction({
        name: "run",
        runtimeAccess: { variables: [{ scope: "app", path: "session\\token" }] },
        handler() {},
      }),
    ).toThrow("invalid runtime path");
    expect(() => defineAction({ name: "run", runsOn: ["browser/large"], handler() {} })).toThrow(
      "invalid or reserved worker label",
    );
  });

  it("uses explicit manifest filename before environment and the default", () => {
    expect(resolveManifestFileName()).toBe("windforce.json");
    expect(resolveManifestFileName({ environment: { [MANIFEST_FILE_ENV]: "scraping.json" } })).toBe(
      "scraping.json",
    );
    expect(
      resolveManifestFileName({
        manifestFile: "imprun.json",
        environment: { [MANIFEST_FILE_ENV]: "scraping.json" },
      }),
    ).toBe("imprun.json");
  });

  it("materializes canonical artifacts outside Core", async () => {
    const action = defineAction({
      name: "run",
      inputSchema: { schema: { type: "object" } },
      handler() {
        return "ok";
      },
    });
    const app = defineApp({ name: "fixture", entrypoint: "src/main.ts", actions: [action] });
    const root = await mkdtemp(join(tmpdir(), "imprun-app-sdk-"));
    await writeAppArtifacts(app, { root, manifestFile: "imprun.json" });
    const manifest = JSON.parse(await readFile(join(root, "imprun.json"), "utf8"));
    expect(manifest.app).toBe("fixture");
    expect(await readFile(join(root, "schemas", "run.input.schema.json"), "utf8")).toContain(
      '"type": "object"',
    );
  });
});
