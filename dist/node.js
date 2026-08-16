import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
/** Materialize an App-owned canonical deployment artifact without invoking Core. */
export async function writeAppArtifacts(app, options = {}) {
    const root = resolve(options.root ?? process.cwd());
    const artifacts = app.describe({
        ...options,
        environment: options.environment ?? process.env,
    });
    for (const [path, content] of Object.entries(artifacts.files)) {
        const destination = resolve(root, path);
        const fromRoot = relative(root, destination);
        if (fromRoot.startsWith("..") || fromRoot.includes(":") || fromRoot === "") {
            throw new Error(`artifact path escapes the output root: ${path}`);
        }
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, content, "utf8");
    }
    return artifacts;
}
//# sourceMappingURL=node.js.map