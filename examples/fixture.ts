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

export const app = defineApp({
  name: "fixture",
  entrypoint: "examples/fixture.ts",
  actions: [echo],
});

export const main = app.main;
