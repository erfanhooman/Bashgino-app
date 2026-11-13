import { API_BASE_URL } from "./client";

/**
 * Media URLs from the API may point at `localhost`.
 *
 * The backend builds public object URLs from `S3_PUBLIC_ENDPOINT_URL`, which is
 * `http://localhost:9000` in development because the browser and MinIO share the
 * host. On an Android device `localhost` is the phone, so every illustration
 * 404s silently. Rewriting the loopback host to the API host keeps the payload
 * untouched and works on an emulator (`10.0.2.2`), a LAN device, and production
 * (where the URL is already absolute and never matches this branch).
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const loopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;
  if (!loopback.test(url)) return url;

  try {
    const api = new URL(API_BASE_URL);
    const media = new URL(url);
    // Only the host changes: MinIO listens on its own port (9000), while the API
    // answers on 8888. Taking `api.host` wholesale pointed the images at Django.
    const port = media.port ? `:${media.port}` : "";
    return `${api.protocol}//${api.hostname}${port}${media.pathname}${media.search}`;
  } catch {
    return url;
  }
}
