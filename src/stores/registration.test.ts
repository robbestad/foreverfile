// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { id } from "@/test/helpers";
const register = vi.hoisted(() => vi.fn());
vi.mock("@/lib/registry", () => ({ registerRecord: register }));
afterEach(() => { localStorage.clear(); register.mockReset(); vi.resetModules(); });
it("persists only the ID on failure and retries after a module restart", async () => {
  register.mockRejectedValueOnce(new Error("offline"));
  const first = await import("./registration");
  first.queueRegistration(id);
  await vi.waitFor(() => expect(first.registration.get().error).not.toBeNull());
  expect(localStorage.getItem("foreverfile:pending-registration:v1")).toBe(JSON.stringify([id]));
  vi.resetModules();
  register.mockResolvedValue(undefined);
  const next = await import("./registration");
  await next.syncRegistrations();
  expect(register).toHaveBeenLastCalledWith(id);
  expect(next.registration.get()).toEqual({ pending: 0, working: false, error: null });
  expect(localStorage.getItem("foreverfile:pending-registration:v1")).toBe("[]");
});
it("deduplicates registration attempts without repeating uploads", async () => {
  register.mockResolvedValue(undefined);
  localStorage.setItem("foreverfile:pending-registration:v1", JSON.stringify([id, id, "bad"]));
  const { syncRegistrations } = await import("./registration");
  await syncRegistrations(); await syncRegistrations();
  expect(register).toHaveBeenCalledTimes(1);
});
