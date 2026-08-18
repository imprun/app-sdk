import type { WindforceContext } from "./context.js";
export declare const DEFAULT_MANIFEST_FILE = "windforce.json";
export declare const MANIFEST_FILE_ENV = "WINDFORCE_CORE_MANIFEST_FILE";
export type Awaitable<T> = T | Promise<T>;
type ActionHandler<TInput, TOutput> = {
    bivarianceHack(context: WindforceContext<TInput>): Awaitable<TOutput>;
}["bivarianceHack"];
export type JsonSchema = Readonly<Record<string, unknown>>;
export type RuntimeConfigScope = "workspace" | "app" | "actor";
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
export type SchemaSource = {
    path: string;
    schema?: never;
} | {
    path?: string;
    schema: JsonSchema;
};
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
export type Middleware = (context: WindforceContext, next: () => Promise<unknown>) => Promise<unknown>;
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
export declare function resolveManifestFileName(options?: DescribeOptions): string;
export declare function defineAction<const TName extends string, TInput = unknown, TOutput = unknown>(options: DefineActionOptions<TName, TInput, TOutput>): DefinedAction<TName, TInput, TOutput>;
export declare function describeApp(app: DefinedApp, options?: DescribeOptions): AppArtifacts;
export declare function defineApp(options: DefineAppOptions): DefinedApp;
export {};
//# sourceMappingURL=manifest.d.ts.map