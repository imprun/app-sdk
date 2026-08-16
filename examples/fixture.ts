import { defineAction, defineApp } from "../src/index.js";

const echo = defineAction<"echo", { message: string }, { message: string }>({
  name: "echo",
  inputSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: { message: { type: "string" } },
    },
  },
  outputSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: { message: { type: "string" } },
    },
  },
  handler: async (ctx) => ({ message: ctx.input.message }),
});

const review = defineAction<
  "review",
  { title: string },
  { taskId: string; outcome: "submit" | "cancel" }
>({
  name: "review",
  inputSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  },
  outputSchema: {
    schema: {
      type: "object",
      required: ["taskId", "outcome"],
      properties: {
        taskId: { type: "string" },
        outcome: { enum: ["submit", "cancel"] },
      },
    },
  },
  runsOn: ["browser"],
  runtimeAccess: {
    variables: [
      { scope: "workspace", path: "defaults/locale" },
      { scope: "app", path: "connections/default/session" },
    ],
    resources: [
      { scope: "workspace", path: "shared/publisher" },
      { scope: "app", path: "connections/default/profile" },
    ],
    writeVariables: [{ scope: "app", path: "connections/default/session", storage: "secret" }],
    writeResources: [{ scope: "app", path: "connections/default/profile" }],
  },
  handler: async (ctx) => {
    const decision = await ctx.human.wait({
      kind: "form",
      title: `Review ${ctx.input.title}`,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { approved: { type: "boolean" } },
      },
    });
    return { taskId: decision.taskId, outcome: decision.outcome };
  },
});

export const app = defineApp({
  name: "fixture",
  entrypoint: "examples/fixture.ts",
  actions: [echo, review],
});

export const main = app.main;
