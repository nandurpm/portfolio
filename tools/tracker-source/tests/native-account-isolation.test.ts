import { afterEach, expect, it, vi } from "vitest";
import { financialFixture } from "./fixtures/financial";
import { cloudPlan } from "../src/cloud/model";
import type { Session } from "@supabase/supabase-js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("../src/cloud/client");
});

async function setup(linked: boolean) {
  vi.resetModules();
  vi.useFakeTimers();
  const e = financialFixture();
  const base = cloudPlan(e.data);
  if (linked)
    e.sync = {
      ownerId: "11111111-1111-4111-8111-111111111111",
      revision: 1,
      base,
      lastSyncAt: "",
    };
  e.data.settings.opening += 1;
  const session = (id: string) =>
    ({
      user: { id, email: "synthetic@example.invalid" },
      access_token: `token-${id}`,
      refresh_token: "synthetic",
    }) as Session;
  let change!: (event: string, value: Session | null) => void;
  const headers: string[] = [];
  let holdBackup: (() => void) | undefined;
  const backup = vi.fn(async () => {
    holdBackup?.();
    return "synthetic-backup";
  });
  const rpc = vi.fn(() => ({
    setHeader: (_key: string, token: string) => {
      headers.push(token);
      return Promise.resolve({
        data: { ok: true, revision: 2, data: cloudPlan(e.data) },
        error: null,
      });
    },
  }));
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: session("11111111-1111-4111-8111-111111111111") },
        error: null,
      }),
      onAuthStateChange: (fn: typeof change) => {
        change = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: (columns: string) => ({
        eq: () => ({
          maybeSingle: () => ({
            setHeader: (_key: string, token: string) => {
              headers.push(token);
              return Promise.resolve({
                data:
                  columns === "revision"
                    ? { revision: 1 }
                    : { data: base, revision: 1 },
                error: null,
              });
            },
          }),
        }),
      }),
    }),
    rpc,
  };
  vi.doMock("../src/cloud/client", () => ({
    supabase,
    readCachedSession: async () => null,
  }));
  vi.stubGlobal("window", {
    desktop: {
      load: async () => ({ envelope: e, dataPath: "synthetic" }),
      save: vi.fn().mockResolvedValue(undefined),
      backup,
    },
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  });
  const { store } = await import("../src/store");
  await store.load();
  const { sync } = await import("../src/cloud/sync");
  await sync.start();
  return {
    sync,
    store,
    rpc,
    headers,
    change: (id: string | null) => change("SIGNED_IN", id ? session(id) : null),
    onBackup: (fn: () => void) => {
      holdBackup = fn;
    },
  };
}

it("binds sync requests to the starting account token and locks preserved data on logout", async () => {
  const t = await setup(true);
  await t.sync.run();
  expect(t.rpc).toHaveBeenCalledOnce();
  expect(
    t.headers.every(
      (h) => h === "Bearer token-11111111-1111-4111-8111-111111111111",
    ),
  ).toBe(true);
  const before = JSON.stringify(t.store.get());
  await t.sync.signOut();
  expect(t.sync.get()).toMatchObject({ session: null, locked: true });
  expect(JSON.stringify(t.store.get())).toBe(before);
  t.change("22222222-2222-4222-8222-222222222222");
  await Promise.resolve();
  expect(t.sync.get().locked).toBe(true);
  await t.sync.run();
  expect(t.rpc).toHaveBeenCalledOnce();
  t.sync.stop();
});

it("does not upload a prior workspace when the account changes during pre-link backup", async () => {
  const t = await setup(false);
  await t.sync.run();
  t.onBackup(() => t.change("22222222-2222-4222-8222-222222222222"));
  await t.sync.connect("device");
  expect(t.rpc).not.toHaveBeenCalled();
  expect(t.sync.get().error).toContain("Account changed");
  expect(t.store.get().sync).toBeUndefined();
  t.sync.stop();
});
