export interface ResumeUrls {
    approve: string;
    reject: string;
    resume_id: number;
    step_index: number;
    expires_at: number;
}
export interface HumanTaskRequest {
    key?: string;
    kind?: "form";
    title: string;
    description?: string;
    inputSchema: Record<string, unknown>;
    presentation?: Record<string, unknown>;
    privateContext?: unknown;
    timeoutMs?: number;
}
export interface HumanTaskDecision<T = unknown> {
    taskId: string;
    outcome: "submit" | "cancel";
    value?: T;
}
export interface RuntimeMutationOptions {
    operationId: string;
    expectedRevision?: number;
}
export interface RuntimeMutationResult {
    path: string;
    revision: number;
    replayed?: boolean;
}
/**
 * The public structural context consumed by an App. Windforce Core owns the
 * meaning and transport of these capabilities; this SDK never constructs them.
 */
export interface WindforceContext<TInput = unknown> {
    input: TInput;
    trigger: {
        kind: "api" | "webhook" | "schedule" | "manual" | string;
        raw?: unknown;
        headers?: Record<string, string>;
        scheduledFor?: string;
    };
    app: string;
    action: string;
    job: {
        id: string;
        path?: string;
        workspace: string;
        tag: string;
    };
    actor: {
        email: string;
        username: string;
        permissionedAs: string;
    };
    telemetry: {
        traceparent?: string;
        tracestate?: string;
    };
    logger: {
        info(...args: unknown[]): void;
        warn(...args: unknown[]): void;
        error(...args: unknown[]): void;
        debug(...args: unknown[]): void;
    };
    variables: {
        get(path: string, scope?: "workspace" | "app"): Promise<string>;
        set(path: string, value: string, options: RuntimeMutationOptions): Promise<RuntimeMutationResult>;
    };
    resources: {
        get<T = unknown>(path: string, scope?: "workspace" | "app"): Promise<T>;
        set(path: string, value: unknown, resourceType: string, options: RuntimeMutationOptions): Promise<RuntimeMutationResult>;
    };
    state: {
        get(): Promise<unknown>;
        set(value: unknown): Promise<void>;
    };
    http: {
        fetch: typeof fetch;
    };
    human: {
        wait<T = unknown>(request: HumanTaskRequest): Promise<HumanTaskDecision<T>>;
    };
    approval: {
        getResumeUrls(approver?: string): Promise<ResumeUrls>;
    };
    flow: {
        resumeValue?: unknown;
    };
}
//# sourceMappingURL=context.d.ts.map