import { createServer, type Server } from "node:http";
import config from "../src/cloud/config.json";
export const WINDOWS_REDIRECT = "http://127.0.0.1:43819/auth/callback";
let server: Server | undefined, rejectPending: ((e: Error) => void) | undefined;
export function validateGoogleAuthorization(raw: string) {
  const u = new URL(raw);
  if (
    u.origin !== new URL(config.url).origin ||
    u.pathname !== "/auth/v1/authorize" ||
    u.searchParams.get("provider") !== "google" ||
    u.searchParams.get("redirect_to") !== WINDOWS_REDIRECT ||
    u.searchParams.get("code_challenge_method") !== "s256" ||
    !u.searchParams.get("code_challenge") ||
    u.username ||
    u.password ||
    u.hash
  )
    throw Error("Untrusted Google authorization request.");
  return u.href;
}
export function cancelGoogleOAuth() {
  rejectPending?.(Error("Google sign-in cancelled."));
}
export async function openGoogleOAuth(
  raw: string,
  openExternal: (url: string) => Promise<void>,
  focus: () => void,
): Promise<string> {
  const url = validateGoogleAuthorization(raw);
  if (server) throw Error("Google sign-in is already open.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const local = createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'",
      );
      res.setHeader("Referrer-Policy", "no-referrer");
      if (
        req.method !== "GET" ||
        req.headers.host !== "127.0.0.1:43819" ||
        !req.url?.startsWith("/auth/callback?")
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const callback = new URL(req.url, WINDOWS_REDIRECT);
      if (
        callback.pathname !== "/auth/callback" ||
        callback.hash ||
        callback.searchParams.has("access_token") ||
        callback.searchParams.has("refresh_token") ||
        (callback.searchParams.has("code")
          ? callback.searchParams.getAll("code").length !== 1 ||
            !/^[A-Za-z0-9._~-]{1,2048}$/.test(
              callback.searchParams.get("code") ?? "",
            ) ||
            callback.searchParams.has("error")
          : !callback.searchParams.has("error"))
      ) {
        res.writeHead(400);
        res.end("Invalid sign-in response.");
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        "<!doctype html><title>Savings and Expense Tracker</title><h1>Return to Savings and Expense Tracker</h1><p>Your sign-in response has been received. You can close this browser tab.</p>",
      );
      finish(undefined, callback.href);
      focus();
    });
    const finish = (error?: Error, callback?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      local.close();
      local.closeAllConnections();
      server = undefined;
      rejectPending = undefined;
      if (error) reject(error);
      else resolve(callback!);
    };
    const timer = setTimeout(
      () => finish(Error("Google sign-in timed out. Please try again.")),
      10 * 60 * 1000,
    );
    server = local;
    rejectPending = (e) => finish(e);
    local.on("error", () =>
      finish(
        Error(
          "Cannot open the local Google sign-in callback on port 43819. Close another tracker instance and try again.",
        ),
      ),
    );
    local.listen(43819, "127.0.0.1", () => {
      void openExternal(url).catch(() =>
        finish(Error("Could not open your browser.")),
      );
    });
  });
}
