import type { RuntimeCapabilities, WindforceContext } from "./context.js";

const RUNTIME_KEY = "_SCRAPING_RUNTIME";

interface CapabilityPayload {
  baseUrl: string;
  runRef: string;
  runToken: string;
  available: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): CapabilityPayload | undefined {
  if (!isRecord(value) || !isRecord(value.capabilities)) return undefined;
  const payload = value.capabilities;
  if (
    typeof payload.baseUrl !== "string" ||
    typeof payload.runRef !== "string" ||
    typeof payload.runToken !== "string" ||
    !Array.isArray(payload.available) ||
    !payload.available.every((item) => typeof item === "string")
  ) {
    throw new Error("invalid worker capability metadata");
  }
  return {
    baseUrl: payload.baseUrl,
    runRef: payload.runRef,
    runToken: payload.runToken,
    available: payload.available,
  };
}

function loopbackBaseURL(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const isIPv4Loopback = /^127(?:\.[0-9]{1,3}){3}$/.test(host);
  const isIPv6Loopback = host === "[::1]" || host === "::1";
  if (
    url.protocol !== "http:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.port === "" ||
    (host !== "localhost" && !isIPv4Loopback && !isIPv6Loopback)
  ) {
    throw new Error("worker capability gateway must use an explicit loopback HTTP URL");
  }
  return url;
}

function createCapabilities(payload: CapabilityPayload): RuntimeCapabilities {
  const baseURL = loopbackBaseURL(payload.baseUrl);
  if (
    payload.runRef === "" ||
    payload.runRef.length > 256 ||
    payload.runToken === "" ||
    payload.runToken.length > 4096 ||
    payload.available.length === 0
  ) {
    throw new Error("invalid worker capability credentials");
  }
  const available = Object.freeze([...new Set(payload.available)].sort());
  const headers = Object.freeze({ Authorization: `Bearer ${payload.runToken}` });
  const endpoint = (path: string): URL => {
    if (
      path === "" ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new Error("capability endpoint path must be a safe relative path");
    }
    const url = new URL(`v1/runs/${encodeURIComponent(payload.runRef)}/${path}`, baseURL);
    if (url.origin !== baseURL.origin)
      throw new Error("capability endpoint escaped loopback gateway");
    return url;
  };
  return Object.freeze({
    available,
    headers,
    has(capability: string) {
      return available.includes(capability);
    },
    endpoint(path: string) {
      return endpoint(path).toString();
    },
    webSocketEndpoint(path: string) {
      const url = endpoint(path);
      url.protocol = "ws:";
      return url.toString();
    },
  });
}

export function consumeRuntimeCapabilities<TInput>(
  context: WindforceContext<TInput>,
): WindforceContext<TInput> {
  if (!isRecord(context.input) || !(RUNTIME_KEY in context.input)) return context;
  const input = { ...context.input };
  const runtime = input[RUNTIME_KEY];
  delete input[RUNTIME_KEY];
  const payload = parsePayload(runtime);
  return {
    ...context,
    input: input as TInput,
    ...(payload ? { capabilities: createCapabilities(payload) } : {}),
  };
}
