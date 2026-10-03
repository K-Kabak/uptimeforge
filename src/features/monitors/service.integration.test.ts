import { test, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  createMonitor,
  ownedMonitor,
  setPaused,
  deleteMonitor,
  updateMonitor,
} from "./service";
const input = {
  name: "API",
  url: "https://example.com",
  intervalMinutes: 5,
  timeoutMs: 10000,
};
test("ownership, edit, pause and deletion are enforced", async () => {
  const a = await db().user.create({ data: {} });
  const b = await db().user.create({ data: {} });
  try {
    const m = await createMonitor(a.id, input);
    await expect(ownedMonitor(b.id, m.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteMonitor(b.id, m.id)).rejects.toMatchObject({
      status: 404,
    });
    expect((await setPaused(a.id, m.id, true)).nextCheckAt).toBeNull();
    expect(
      (
        await updateMonitor(a.id, m.id, {
          ...input,
          url: "https://example.org",
        })
      ).configVersion,
    ).toBe(3);
    await deleteMonitor(a.id, m.id);
  } finally {
    await db().user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  }
});
test("concurrent creates cannot exceed the active monitor limit", async () => {
  const user = await db().user.create({ data: {} });
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 11 }, (_, i) =>
        createMonitor(user.id, { ...input, url: `https://example.com/${i}` }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(await db().monitor.count({ where: { userId: user.id } })).toBe(10);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("unsafe URLs are rejected before persistence", async () => {
  await expect(
    createMonitor("unused", { ...input, url: "http://127.0.0.1" }),
  ).rejects.toMatchObject({ code: "BLOCKED_TARGET" });
});
afterAll(async () => db().$disconnect());
