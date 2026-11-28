import { afterEach, describe, expect, it, vi } from "vitest";
import { withSyncDeadline } from "../src/cloud/sync-deadline";

afterEach(() => { vi.useRealTimers(); });

describe("cloud sync request deadline", () => {
  it("returns the exact result and clears the timer on success", async () => {
    vi.useFakeTimers();
    const reply = { data: { revision: 2 }, error: null };
    await expect(withSyncDeadline(() => Promise.resolve(reply))).resolves.toBe(reply);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts an unresponsive request and does not accept a late reply", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    let finish: ((value: string) => void) | undefined;
    const request = vi.fn((signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<string>((resolve) => { finish = resolve; });
    });
    const pending = withSyncDeadline(request, 25);
    const result = expect(pending).rejects.toThrow(/Local changes are retained/);

    await vi.advanceTimersByTimeAsync(25);
    await result;
    expect(requestSignal?.aborted).toBe(true);
    finish?.("late response");
    await vi.runAllTimersAsync();
    expect(request).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not mask an immediate failure or leave a timer running", async () => {
    vi.useFakeTimers();
    const error = new Error("write failed");
    await expect(withSyncDeadline(() => Promise.reject(error))).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});
