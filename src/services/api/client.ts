/**
 * HTTP transport for the Android client.
 *
 * The web app authenticates with HttpOnly cookies + a CSRF double-submit; a
 * native app cannot read those cookies, so this client uses the backend's
 * documented second transport instead: `X-Auth-Transport: bearer` makes the
 * server return `access_token` / `refresh_token` in the JSON body, and every
 * request carries `Authorization: Bearer …`. CSRF is skipped by the server for
 * header transport (`DualTransportAuthentication.authenticate`), which is why
 * no `X-CSRFToken` appears anywhere in this file.
 *
 * Tokens live in Expo SecureStore (Android Keystore-backed), never AsyncStorage
 * and never in the bundle.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import type { ApiErrorBody } from "@bashgino/types";

const FALLBACK_BASE = "http://10.0.2.2:8888";

/**
 * `10.0.2.2` is the Android emulator's alias for the host machine. A physical
 * device needs the host's LAN address instead, so the base URL is configurable
 * through `EXPO_PUBLIC_API_URL` (build profile / `.env`) with the app-config
 * value as the fallback — never hardcoded at a call site.
 */
export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  FALLBACK_BASE
)
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

const ACCESS_TOKEN_KEY = "bashgino.access_token";
const REFRESH_TOKEN_KEY = "bashgino.refresh_token";
const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: ApiErrorBody["field_errors"];

  constructor(message: string, status: number, code?: string, fieldErrors?: ApiErrorBody["field_errors"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface TokenState {
  access: string | null;
  refresh: string | null;
  loaded: boolean;
}

const tokens: TokenState = { access: null, refresh: null, loaded: false };

let refreshInFlight: Promise<boolean> | null = null;

/** Called whenever the session dies, so the store can drop the user. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

export async function loadTokens(): Promise<TokenState> {
  if (tokens.loaded) return tokens;
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null),
  ]);
  tokens.access = access;
  tokens.refresh = refresh;
  tokens.loaded = true;
  return tokens;
}

export async function saveTokens(access: string | null, refresh: string | null): Promise<void> {
  tokens.access = access;
  tokens.refresh = refresh;
  tokens.loaded = true;
  await Promise.all([
    access ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access) : SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    refresh ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh) : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]).catch(() => undefined);
}

export async function clearTokens(): Promise<void> {
  tokens.access = null;
  tokens.refresh = null;
  tokens.loaded = true;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined),
  ]);
}

export function hasRefreshToken(): boolean {
  return Boolean(tokens.refresh);
}

/** milliseconds until the access token expires, or null when it has no `exp`. */
export function accessTokenRemainingMs(): number | null {
  if (!tokens.access) return null;
  const payload = tokens.access.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      ),
    ) as { exp?: number };
    if (!json.exp) return null;
    return json.exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

/**
 * Exchanges the refresh token for a new pair.
 *
 * Single-flight: the roster, the dashboard and the notification badge all fire
 * on the same screen, and three concurrent refreshes would rotate the token
 * family three times — the server treats a replayed rotated token as theft and
 * revokes the session.
 */
export async function refreshSession(): Promise<boolean> {
  if (!tokens.refresh) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Auth-Transport": "bearer",
        },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      if (!response.ok) return false;
      const body = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!body.access_token) return false;
      // The refresh endpoint rotates the pair; keeping the old refresh token
      // would make the next refresh look like a replay.
      await saveTokens(body.access_token, body.refresh_token ?? tokens.refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as ApiErrorBody;
    if (record.messages?.fa) return record.messages.fa;
    if (record.message_fa) return record.message_fa;
    if (typeof record.message === "string" && record.message) return record.message;
    if (typeof record.detail === "string") return record.detail;
    const firstField = record.field_errors ? Object.values(record.field_errors)[0] : null;
    if (typeof firstField === "string") return firstField;
    if (Array.isArray(firstField) && typeof firstField[0] === "string") return firstField[0];
    if (firstField && typeof firstField === "object" && "fa" in firstField && firstField.fa) {
      return String(firstField.fa);
    }
  }
  if (status === 401) return "نشست شما منقضی شده است. دوباره وارد شوید.";
  if (status === 403) return "اجازه انجام این کار را ندارید.";
  if (status === 404) return "موردی یافت نشد.";
  if (status >= 500) return "خطای سرور. لطفاً بعداً دوباره تلاش کنید.";
  return "درخواست انجام نشد.";
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Tenant scope — the active workspace. Omitted on auth and personal endpoints. */
  orgId?: string | null;
  signal?: AbortSignal;
  /** Skip the Authorization header (login, OTP, invitation lookup). */
  anonymous?: boolean;
  /** Skip the 401 → refresh → retry pass (the refresh call itself). */
  noRetry?: boolean;
}

async function rawRequest(path: string, options: RequestOptions, authorization: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    // The catalogue localises `localized_name` from this header; without it the
    // API falls back to Persian only when the header is absent, and RN sends
    // nothing by default.
    "Accept-Language": "fa",
    // Native transport. Without this every request is cookie-authenticated, and
    // `/auth/login/` returns no tokens at all (the server only puts them in the
    // body when the client asks for bearer) — the app then looks signed in until
    // it restarts and the in-memory cookie jar is gone.
    "X-Auth-Transport": "bearer",
  };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (authorization) headers.Authorization = `Bearer ${authorization}`;
  if (options.orgId) headers["X-Organization-Id"] = options.orgId;

  // FormData must go out untouched: React Native has to set the multipart
  // boundary itself, and stringifying a FormData produces `{}`.
  const body =
    options.body === undefined
      ? undefined
      : options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);

  return fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  await loadTokens();

  // Proactive refresh: an access token with under a minute left will die mid
  // request on a slow connection, and the user would see a spurious error.
  const remaining = accessTokenRemainingMs();
  if (!options.anonymous && tokens.refresh && remaining !== null && remaining < 60_000) {
    await refreshSession();
  }

  let response = await rawRequest(path, options, options.anonymous ? null : tokens.access);

  if (response.status === 401 && !options.anonymous && !options.noRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await rawRequest(path, options, tokens.access);
    } else {
      await clearTokens();
      onSessionExpired?.();
    }
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const body = (parsed ?? {}) as ApiErrorBody;
    throw new ApiError(
      messageFromBody(parsed, response.status),
      response.status,
      typeof body.code === "string" ? body.code : undefined,
      body.field_errors,
    );
  }

  return (parsed ?? null) as T;
}
