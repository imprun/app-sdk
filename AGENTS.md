# Imprun Application SDK repository policy

This public repository owns the optional TypeScript authoring SDK used inside
Windforce App bundles.

- Keep the package an ordinary, opaque App dependency. Windforce Core must not
  inspect the package name, SDK version, action envelopes, or builder protocol.
- Depend only on the public, structural `WindforceContext` contract. Never read
  private `WF_*` environment variables, carry Worker credentials, call
  `/worker/v1`, or write Core queue state.
- `defineAction` and `defineApp` own author ergonomics and App-local dispatch.
  Core continues to own admission, manifest semantics, scheduling, execution,
  cancellation, logging, masking, and completion.
- Manifest and schema generation is an App-owned build step. It must emit the
  canonical public Core schema without requiring Core to execute author code.
- Runtime writes are exact-path, App-scoped grants. Do not widen permissions,
  introduce implicit Workspace fallback, or allow a handler to choose a Secret
  storage class at runtime.
- Keep private scraping SDK code, domain contracts, fixtures, and dependencies
  outside this repository.
- Preserve manual `main(ctx)` Apps and direct `windforce-client` consumers; use
  of this package remains optional.

Before integrating changes, run `npm run check`, `npm run build`,
`npm pack --dry-run`, and `git diff --check`. Keep generated `dist/` synchronized
so an exact Git commit can be consumed before an npm release exists.
