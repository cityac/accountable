import { useSyncExternalStore } from "react";

export type ApiErrorKind = "fields" | "missing" | "connection" | "server";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly fields: Record<string, string>;

  constructor(kind: ApiErrorKind, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.fields = fields;
  }
}

export const CONNECTION_MESSAGE = "Can't reach Accountable. Check that it's still running.";

let connectionLost = false;
const listeners = new Set<() => void>();
const reconnectListeners = new Set<() => void>();

function setConnectionLost(lost: boolean) {
  if (lost === connectionLost) return;
  connectionLost = lost;
  listeners.forEach((listener) => listener());
  if (!lost) reconnectListeners.forEach((listener) => listener());
}

/** Runs each time the connection comes back, whichever reply showed it. */
export function onReconnect(listener: () => void) {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}

export function isConnectionLost() {
  return connectionLost;
}

export function useConnectionLost() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => connectionLost,
  );
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

type ErrorReply = { detail?: string; fields?: Record<string, string> } | null;

async function readError(reply: Response): Promise<ErrorReply> {
  try {
    return await reply.json();
  } catch {
    return null;
  }
}

async function send(path: string, { method = "GET", body, signal }: Options): Promise<Response> {
  try {
    return await fetch(`/api${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    setConnectionLost(true);
    throw new ApiError("connection", CONNECTION_MESSAGE);
  }
}

// The backend answers every error in JSON. A non-JSON 5xx comes from the dev
// server, which is still up but can't reach the backend behind it.
function backendUnreachable(reply: Response) {
  const isJson = reply.headers.get("content-type")?.includes("application/json") ?? false;
  return reply.status >= 500 && !isJson;
}

async function failure(reply: Response): Promise<ApiError> {
  const data = await readError(reply);
  if (reply.status === 404) return new ApiError("missing", data?.detail ?? "That record no longer exists.");
  if (reply.status === 422) return new ApiError("fields", data?.detail ?? "Check the form.", data?.fields ?? {});
  return new ApiError("server", data?.detail ?? "Something went wrong.");
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const reply = await send(path, options);
  if (backendUnreachable(reply)) {
    setConnectionLost(true);
    throw new ApiError("connection", CONNECTION_MESSAGE);
  }
  setConnectionLost(false);

  if (!reply.ok) throw await failure(reply);
  return (reply.status === 204 ? undefined : await reply.json()) as T;
}
