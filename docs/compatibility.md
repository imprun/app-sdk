# Core compatibility

This table is a tested snapshot, not a promise that the SDK and Core must ship
together. The Application SDK remains an opaque App dependency and Core remains
SDK-neutral.

| Application SDK | Verified Core source | Core Author SDK | Evidence |
| --- | --- | --- | --- |
| `@imprun/app-sdk` 0.1 | [`07e74ae`](https://github.com/imprun/windforce-core/commit/07e74ae028c838c99ba2d4749444b1d748c42775) | injected `windforce-client` 0.1 | multi-Action fixture, deterministic manifest/schema tests, and Core manifest parser check |

The 0.1 structural context mirrors Core's public `main(ctx)` contract for input,
trigger, identifiers, actor, telemetry, logger, Variables, Resources, state,
HTTP, HumanTask, approval, and flow resume values. It never constructs the
context or reads private Worker transport.

The conformance fixture covers:

- SDK-neutral Action dispatch;
- inline input and output schema generation;
- action-level `runsOn` placement;
- exact Workspace/App Variable and Resource reads;
- App-scoped Secret Variable and Resource writes;
- exact actor-scoped Variable and Resource reads and writes when Core supports
  ADR 0049;
- `ctx.human.wait` authoring;
- `windforce.json`, explicit manifest names, and
  `WINDFORCE_CORE_MANIFEST_FILE` precedence.

Existing Apps that export manual `main(ctx)` or use Core's injected
`windforce-client.createApp` remain supported. A Core upgrade should be checked
against this structural context and generated manifest fixture before the
compatibility row is advanced.
