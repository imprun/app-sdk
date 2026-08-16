# ADR 0001: Publish the Application SDK as an opaque App dependency

## Status

Accepted (2026-08-17).

## Context

Windforce Core owns the SDK-neutral `main(ctx)` runtime interface and injects
the low-level `windforce-client` helper when it prepares a Release. Public App
repositories still need an ordinary dependency for local types, code-first
Action definitions, manifest generation, tests, and editor support.

Core ADR 0021 already requires every Application SDK to remain opaque to Core.
The new package therefore cannot own launcher transport, Job credentials,
scheduling, admission, or completion, and it cannot expose private SDK code.

## Decision

1. The public repository is `imprun/app-sdk` and the package name is
   `@imprun/app-sdk`.
2. Version 0.1 supports TypeScript Apps. Other language authoring packages are
   future independent decisions; they do not change the Core runtime.
3. The SDK defines structural public `WindforceContext` types but never
   constructs the context or consumes private `WF_*` transport.
4. `defineAction` owns typed handlers and release-owned declarations.
   `defineApp` owns App-local dispatch and exposes the required `main(ctx)`.
5. Manifest and companion schema generation is an explicit App-owned build
   operation. The SDK does not make Core import or execute author code.
6. `windforce.json` remains the default manifest filename. An explicit builder
   option precedes `WINDFORCE_CORE_MANIFEST_FILE`, which precedes the default.
7. Core conformance and SDK conformance remain federated. This repository tests
   the author API and generated artifacts against documented Core versions;
   Core CI does not depend on this package or any private Application SDK.
8. Manual `main(ctx)` Apps and direct `windforce-client` consumers remain
   supported. Adoption is optional and incremental.

## Consequences

- The Application SDK and Core can release independently.
- A public App can type-check and generate deployment artifacts without cloning
  Core or copying `windforce-client` declarations.
- An exact Git commit may be consumed before an npm release. Registry release
  and semver compatibility policy remain separate release decisions.
- Private scraping SDKs may adapt to the public package but are not moved here.
