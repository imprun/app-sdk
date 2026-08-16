import type { AppArtifacts, DefinedApp, DescribeOptions } from "./manifest.js";
export interface WriteAppArtifactsOptions extends DescribeOptions {
    root?: string;
}
/** Materialize an App-owned canonical deployment artifact without invoking Core. */
export declare function writeAppArtifacts(app: DefinedApp, options?: WriteAppArtifactsOptions): Promise<AppArtifacts>;
//# sourceMappingURL=node.d.ts.map