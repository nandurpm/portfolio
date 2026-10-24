import { afterEach, expect, it, vi } from "vitest";
import {
  openGoogleOAuth,
  cancelGoogleOAuth,
  validateGoogleAuthorization,
  WINDOWS_REDIRECT,
} from "../electron/google-oauth";
import config from "../src/cloud/config.json";
const authorization = () =>
  `${config.url}/auth/v1/authorize?${new URLSearchParams({ provider: "google", redirect_to: WINDOWS_REDIRECT, code_challenge: "challenge", code_challenge_method: "s256" })}`;
afterEach(() => cancelGoogleOAuth());
it("rejects arbitrary sites, other providers and requests without PKCE", () => {
  for (const u of [
    "https://evil.example/auth/v1/authorize",
    authorization().replace("google", "github"),
    authorization().replace(
      "code_challenge_method=s256",
      "code_challenge_method=plain",
    ),
  ])
    expect(() => validateGoogleAuthorization(u)).toThrow();
});
it("only accepts the bound loopback callback, returns the code and closes the listener", async () => {
  const focus = vi.fn();
  let opened!: () => void;
  const ready = new Promise<void>((r) => {
    opened = r;
  });
  const result = openGoogleOAuth(
    authorization(),
    async () => {
      opened();
    },
    focus,
  );
  await ready;
  const bad = await fetch("http://127.0.0.1:43819/unrelated");
  expect(bad.status).toBe(404);
  for (const query of [
    "?code=a&code=b",
    "?code=",
    "?code=a&access_token=secret",
    "?code=a&error=denied",
  ]) {
    expect((await fetch(WINDOWS_REDIRECT + query)).status).toBe(400);
  }
  const good = await fetch(WINDOWS_REDIRECT + "?code=test-code");
  expect(good.status).toBe(200);
  expect(await good.text()).not.toContain("test-code");
  expect(await result).toBe(WINDOWS_REDIRECT + "?code=test-code");
  expect(focus).toHaveBeenCalledOnce();
  await expect(fetch(WINDOWS_REDIRECT + "?code=late")).rejects.toThrow();
});
it("cancels a waiting browser flow without accepting a late code", async () => {
  let opened!: () => void;
  const ready = new Promise<void>((r) => {
    opened = r;
  });
  const result = openGoogleOAuth(
    authorization(),
    async () => {
      opened();
    },
    () => {},
  );
  const rejected = expect(result).rejects.toThrow("cancelled");
  await ready;
  cancelGoogleOAuth();
  await rejected;
});
