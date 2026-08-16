import type { WindforceContext } from "./context.js";

export const DEFAULT_MANIFEST_FILE = "windforce.json";
export const MANIFEST_FILE_ENV = "WINDFORCE_CORE_MANIFEST_FILE";
const MAX_TIMEOUT_SECONDS = 2_147_483_647;

export type Awaitable<T> = T | Promise<T>;
type ActionHandler<TInput, TOutput> = {
  bivarianceHack(context: WindforceContext<TInput>): Awaitable<TOutput>;
}["bivarianceHack"];
export type JsonSchema = Readonly<Record<string, unknown>>;
export type RuntimeConfigScope = "workspace" | "app";
export type RuntimeVariableStorage = "plain" | "secret";

export interface RuntimeConfigTarget {
  scope: RuntimeConfigScope;
  path: string;
}

export interface RuntimeVariableWriteTarget extends RuntimeConfigTarget {
  storage: RuntimeVariableStorage;
}

export interface RuntimeAccess {
  variables?: readonly RuntimeConfigTarget[];
  resources?: readonly RuntimeConfigTarget[];
  writeVariables?: readonly RuntimeVariableWriteTarget[];
  writeResources?: readonly RuntimeConfigTarget[];
}

export type SchemaSource = { path: string; schema?: never } | { path?: string; schema: JsonSchema };

export interface DefineActionOptions<TName extends string, TInput, TOutput> {
  name: TName;
  inputSchema?: SchemaSource;
  outputSchema?: SchemaSource;
  operatorSettingsSchema?: SchemaSource;
  timeout?: number;
  runsOn?: readonly string[];
  runtimeAccess?: RuntimeAccess;
  handler: ActionHandler<TInput, TOutput>;
}

export interface DefinedAction<TName extends string = string, TInput = unknown, TOutput = unknown> {
  readonly name: TName;
  readonly inputSchema?: SchemaSource;
  readonly outputSchema?: SchemaSource;
  readonly operatorSettingsSchema?: SchemaSource;
  readonly timeout?: number;
  readonly runsOn?: readonly string[];
  readonly runtimeAccess?: RuntimeAccess;
  readonly handler: ActionHandler<TInput, TOutput>;
}

export type Middleware = (
  context: WindforceContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

export interface DefineAppOptions {
  name: string;
  entrypoint: string;
  timeout?: number;
  runsOn?: readonly string[];
  actions: readonly DefinedAction[];
  use?: readonly Middleware[];
  onError?: (context: WindforceContext, error: unknown) => Awaitable<unknown>;
}

export interface ManifestAction {
  inputSchema?: string;
  outputSchema?: string;
  operatorSettingsSchema?: string;
  timeout?: number;
  runsOn?: string[];
  runtimeAccess?: RuntimeAccess;
}

export interface AppManifest {
  app: string;
  entrypoint: string;
  scriptLang: "typescript";
  timeout?: number;
  runsOn?: string[];
  actions: Record<string, ManifestAction>;
}

export interface DescribeOptions {
  manifestFile?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  schemaDirectory?: string;
}

export interface AppArtifacts {
  manifestFile: string;
  manifest: AppManifest;
  /** Relative deployment paths mapped to deterministic UTF-8 file contents. */
  files: Readonly<Record<string, string>>;
}

export interface DefinedApp {
  readonly name: string;
  readonly actions: readonly DefinedAction[];
  readonly main: (context: WindforceContext) => Promise<unknown>;
  describe(options?: DescribeOptions): AppArtifacts;
}

function validateAppName(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_]{2,64}$/.test(normalized)) {
    throw new Error(`invalid app key ${JSON.stringify(value)}`);
  }
  return normalized;
}

function validateActionName(value: string): string {
  const normalized = value.trim();
  const segments = normalized.split(".");
  if (
    normalized.length === 0 ||
    normalized.length > 128 ||
    segments.length > 8 ||
    segments.some((segment) => !/^[A-Za-z0-9_]+$/.test(segment))
  ) {
    throw new Error(`invalid action key ${JSON.stringify(value)}`);
  }
  return normalized;
}

function normalizePortablePath(value: string, kind: string): string {
  const normalized = value.trim();
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    normalized.startsWith("/") ||
    segments.length > 32 ||
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        !/^[A-Za-z0-9_.-]+$/.test(segment),
    )
  ) {
    throw new Error(`invalid ${kind} ${JSON.stringify(value)}`);
  }
  return normalized;
}

function normalizeTarget(target: RuntimeConfigTarget, requireApp: boolean): RuntimeConfigTarget {
  if (target.scope !== "workspace" && target.scope !== "app") {
    throw new Error("runtime target scope must be workspace or app");
  }
  if (requireApp && target.scope !== "app") {
    throw new Error("runtime writes require app scope");
  }
  return { scope: target.scope, path: normalizePortablePath(target.path, "runtime path") };
}

function deduplicate<T>(values: readonly T[], key: (value: T) => string): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push(value);
  }
  return result;
}

function normalizeRuntimeAccess(access: RuntimeAccess | undefined): RuntimeAccess | undefined {
  if (!access) return undefined;
  const variables = deduplicate(
    (access.variables ?? []).map((target) => normalizeTarget(target, false)),
    (target) => `${target.scope}\0${target.path}`,
  );
  const resources = deduplicate(
    (access.resources ?? []).map((target) => normalizeTarget(target, false)),
    (target) => `${target.scope}\0${target.path}`,
  );
  const writeResources = deduplicate(
    (access.writeResources ?? []).map((target) => normalizeTarget(target, true)),
    (target) => `${target.scope}\0${target.path}`,
  );
  const writeVariables = deduplicate(
    (access.writeVariables ?? []).map((target) => {
      if (target.storage !== "plain" && target.storage !== "secret") {
        throw new Error("runtime variable storage must be plain or secret");
      }
      return { ...normalizeTarget(target, true), storage: target.storage };
    }),
    (target) => `${target.scope}\0${target.path}\0${target.storage}`,
  );
  const total = variables.length + resources.length + writeVariables.length + writeResources.length;
  if (total > 256) throw new Error("runtime access exceeds 256 paths");
  const result: RuntimeAccess = {};
  if (variables.length > 0) result.variables = variables;
  if (resources.length > 0) result.resources = resources;
  if (writeVariables.length > 0) result.writeVariables = writeVariables;
  if (writeResources.length > 0) result.writeResources = writeResources;
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeLabels(labels: readonly string[] | undefined): readonly string[] | undefined {
  if (!labels) return undefined;
  const normalized = [...new Set(labels.map((label) => label.trim()))].sort();
  for (const label of normalized) {
    if (
      label.length === 0 ||
      label.startsWith("sys/") ||
      !/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(label)
    ) {
      throw new Error(`invalid or reserved worker label ${JSON.stringify(label)}`);
    }
  }
  if (normalized.length > 16) throw new Error("at most 16 worker labels are allowed");
  return normalized.length > 0 ? normalized : undefined;
}

function schemaPath(
  source: SchemaSource | undefined,
  actionName: string,
  kind: "input" | "output" | "operator-settings",
  directory: string,
  files: Record<string, string>,
): string | undefined {
  if (!source) return undefined;
  if (!("schema" in source)) return normalizePortablePath(source.path, `${kind} schema path`);
  const safeName = actionName.replaceAll(/[^A-Za-z0-9_.-]/g, "_");
  const path = normalizePortablePath(
    source.path ?? `${directory}/${safeName}.${kind}.schema.json`,
    `${kind} schema path`,
  );
  const content = `${JSON.stringify(source.schema, null, 2)}\n`;
  const current = files[path];
  if (current && current !== content)
    throw new Error(`schema path ${path} has conflicting content`);
  files[path] = content;
  return path;
}

export function resolveManifestFileName(options: DescribeOptions = {}): string {
  const explicit = options.manifestFile?.trim();
  const configured = options.environment?.[MANIFEST_FILE_ENV]?.trim();
  return normalizePortablePath(
    explicit || configured || DEFAULT_MANIFEST_FILE,
    "manifest filename",
  );
}

export function defineAction<const TName extends string, TInput = unknown, TOutput = unknown>(
  options: DefineActionOptions<TName, TInput, TOutput>,
): DefinedAction<TName, TInput, TOutput> {
  const name = validateActionName(options.name) as TName;
  const runsOn = normalizeLabels(options.runsOn);
  const runtimeAccess = normalizeRuntimeAccess(options.runtimeAccess);
  const action: DefinedAction<TName, TInput, TOutput> = {
    name,
    handler: options.handler,
    ...(options.inputSchema ? { inputSchema: options.inputSchema } : {}),
    ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
    ...(options.operatorSettingsSchema
      ? { operatorSettingsSchema: options.operatorSettingsSchema }
      : {}),
    ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    ...(runsOn ? { runsOn } : {}),
    ...(runtimeAccess ? { runtimeAccess } : {}),
  };
  if (
    action.timeout !== undefined &&
    (!Number.isInteger(action.timeout) ||
      action.timeout <= 0 ||
      action.timeout > MAX_TIMEOUT_SECONDS)
  ) {
    throw new Error("action timeout must be a positive integer in seconds");
  }
  return Object.freeze(action);
}

export function describeApp(app: DefinedApp, options: DescribeOptions = {}): AppArtifacts {
  const source = app as DefinedApp & { readonly options: DefineAppOptions };
  const schemaDirectory = normalizePortablePath(
    options.schemaDirectory ?? "schemas",
    "schema directory",
  );
  const files: Record<string, string> = {};
  const actions: Record<string, ManifestAction> = {};
  for (const action of source.actions) {
    const manifestAction: ManifestAction = {};
    const inputSchema = schemaPath(
      action.inputSchema,
      action.name,
      "input",
      schemaDirectory,
      files,
    );
    const outputSchema = schemaPath(
      action.outputSchema,
      action.name,
      "output",
      schemaDirectory,
      files,
    );
    const operatorSettingsSchema = schemaPath(
      action.operatorSettingsSchema,
      action.name,
      "operator-settings",
      schemaDirectory,
      files,
    );
    if (inputSchema) manifestAction.inputSchema = inputSchema;
    if (outputSchema) manifestAction.outputSchema = outputSchema;
    if (operatorSettingsSchema) manifestAction.operatorSettingsSchema = operatorSettingsSchema;
    if (action.timeout !== undefined) manifestAction.timeout = action.timeout;
    if (action.runsOn) manifestAction.runsOn = [...action.runsOn];
    if (action.runtimeAccess) manifestAction.runtimeAccess = action.runtimeAccess;
    actions[action.name] = manifestAction;
  }
  const manifest: AppManifest = {
    app: source.name,
    entrypoint: source.options.entrypoint,
    scriptLang: "typescript",
    actions,
  };
  if (source.options.timeout !== undefined) manifest.timeout = source.options.timeout;
  if (source.options.runsOn) manifest.runsOn = [...source.options.runsOn];
  const manifestFile = resolveManifestFileName(options);
  files[manifestFile] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { manifestFile, manifest, files: Object.freeze(files) };
}

export function defineApp(options: DefineAppOptions): DefinedApp {
  const name = validateAppName(options.name);
  const entrypoint = normalizePortablePath(options.entrypoint, "entrypoint");
  const runsOn = normalizeLabels(options.runsOn);
  if (
    options.timeout !== undefined &&
    (!Number.isInteger(options.timeout) ||
      options.timeout <= 0 ||
      options.timeout > MAX_TIMEOUT_SECONDS)
  ) {
    throw new Error("app timeout must be a positive integer in seconds");
  }
  const actions = [...options.actions];
  if (actions.length === 0) throw new Error("an App must define at least one action");
  const byName = new Map<string, DefinedAction>();
  for (const action of actions) {
    if (byName.has(action.name)) throw new Error(`duplicate action ${action.name}`);
    byName.set(action.name, action);
  }
  const normalizedOptions: DefineAppOptions = {
    name,
    entrypoint,
    actions,
    ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    ...(runsOn ? { runsOn } : {}),
    ...(options.use ? { use: options.use } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
  };
  const main = async (context: WindforceContext): Promise<unknown> => {
    const run = async (): Promise<unknown> => {
      const action = byName.get(context.action);
      if (!action) throw new Error(`unknown action: ${context.action}`);
      return action.handler(context);
    };
    let next = run;
    for (let index = (normalizedOptions.use?.length ?? 0) - 1; index >= 0; index--) {
      const middleware = normalizedOptions.use?.[index];
      if (!middleware) continue;
      const downstream = next;
      next = () => middleware(context, downstream);
    }
    if (!normalizedOptions.onError) return next();
    try {
      return await next();
    } catch (error) {
      return normalizedOptions.onError(context, error);
    }
  };
  const app: DefinedApp & { readonly options: DefineAppOptions } = {
    name,
    actions: Object.freeze(actions),
    options: Object.freeze(normalizedOptions),
    main,
    describe(describeOptions) {
      return describeApp(app, describeOptions);
    },
  };
  return Object.freeze(app);
}
