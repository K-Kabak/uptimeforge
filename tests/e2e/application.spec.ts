import { test, expect } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { SignJWT } from "jose";
import { db } from "../../src/lib/db";
let userId: string;
test.beforeEach(async ({ context }) => {
  const user = await db().user.create({
    data: {
      name: "Browser User",
      email: `browser-${randomUUID()}@example.test`,
    },
  });
  userId = user.id;
  const token = randomUUID();
  await db().session.create({
    data: {
      userId,
      sessionToken: token,
      expires: new Date(Date.now() + 3600000),
    },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
});
test.afterEach(async () => {
  await db().user.deleteMany({ where: { id: userId } });
});
test.afterAll(async () => {
  await db().$disconnect();
});
test("manual check completes through the signed worker and redelivery is idempotent", async ({
  page,
}) => {
  const monitor = await db().monitor.create({
    data: {
      userId,
      name: "Worker API",
      url: "https://1.1.1.1/",
      normalizedUrl: "https://1.1.1.1/",
    },
  });
  await page.goto(`/dashboard/monitors/${monitor.id}`);
  const queued = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/monitors/${monitor.id}/check`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Check now" }).click();
  const queuedResponse = await queued;
  expect(queuedResponse.status()).toBe(202);
  const { data } = await queuedResponse.json();
  const body = JSON.stringify({ version: 1, jobId: data.jobId });
  const signature = await new SignJWT({
    body: createHash("sha256").update(body).digest("base64url"),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("Upstash")
    .setSubject("http://localhost:3000/api/internal/check")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(new TextEncoder().encode("local-e2e-signing-key"));
  for (let delivery = 0; delivery < 2; delivery++) {
    expect(
      (
        await page.request.post("/api/internal/check", {
          headers: {
            "upstash-signature": signature,
            "content-type": "application/json",
          },
          data: body,
        })
      ).status(),
    ).toBe(200);
  }
  expect(await db().check.count({ where: { jobId: data.jobId } })).toBe(1);
  await expect(page.getByRole("button", { name: "Check now" })).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(
    (await db().monitor.findUniqueOrThrow({ where: { id: monitor.id } }))
      .nextCheckAt,
  ).toEqual(monitor.nextCheckAt);
});
test("monitor management, public publication and mobile layout", async ({
  page,
  browser,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Create your first monitor")).toBeVisible();
  await page.getByRole("link", { name: "New monitor" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser API");
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://1.1.1.1/health?private=token");
  await page.getByRole("button", { name: "Save monitor" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser API" }),
  ).toBeVisible();
  await expect(
    page.getByText("Monitor created", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Check now" })).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Check now" })).toBeEnabled();
  await page.getByLabel("Color theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Status pages", exact: true }).click();
  await page.getByRole("link", { name: "New status page" }).click();
  const slug = `browser-${randomUUID().slice(0, 8)}`;
  await page.getByLabel("Page name").fill("Browser status");
  await page.getByLabel("Public slug").fill(slug);
  await page.getByLabel("Publish this status page").check();
  await page.getByLabel("Browser API", { exact: true }).check();
  await page.getByLabel("Public name for Browser API").fill("Public API");
  await page.getByRole("button", { name: "Save status page" }).click();
  await expect(
    page.getByText("Status page saved", { exact: true }),
  ).toBeVisible();
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  const response = await publicPage.goto(`/status/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(
    publicPage.getByRole("heading", { name: "Public API" }),
  ).toBeVisible();
  const html = await publicPage.content();
  expect(html).not.toContain("private=token");
  expect(html).not.toContain(userId);
  expect(html).not.toContain("@example.test");
  await anonymous.close();
  const status = await db().statusPage.findFirstOrThrow({ where: { userId } });
  await page.goto(`/dashboard/status-pages/${status.id}`);
  await page
    .getByRole("checkbox", { name: "Publish this status page" })
    .uncheck();
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/status-pages/${status.id}`) &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save status page" }).click();
  expect((await saved).status()).toBe(200);
  await expect(
    page.getByText("Status page saved", { exact: true }),
  ).toBeVisible();
  expect((await page.request.get(`/status/${slug}`)).status()).toBe(404);
});
test("authorization, origin and SSRF boundaries return real HTTP errors", async ({
  page,
  browser,
}) => {
  const other = await db().user.create({ data: {} });
  try {
    const monitor = await db().monitor.create({
      data: {
        userId: other.id,
        name: "Other",
        url: "https://example.com",
        normalizedUrl: "https://example.com/",
      },
    });
    const anon = await browser.newContext();
    expect((await anon.request.get("/api/monitors")).status()).toBe(401);
    await anon.close();
    expect(
      (await page.request.get(`/api/monitors/${monitor.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await page.request.delete(`/api/monitors/${monitor.id}`, {
          headers: { origin: "https://attacker.test" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/monitors", {
          headers: { origin: "http://localhost:3000" },
          data: {
            name: "Blocked",
            url: "http://127.0.0.1",
            intervalMinutes: 5,
            timeoutMs: 10000,
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/internal/check", {
          data: { version: 1, jobId: "fake" },
        })
      ).status(),
    ).toBe(401);
  } finally {
    await db().user.delete({ where: { id: other.id } });
  }
});
test("account deletion invalidates the session and cascades browser data", async ({
  page,
}) => {
  await db().monitor.create({
    data: {
      userId,
      name: "Deleted service",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  await page.goto("/dashboard/account");
  await expect(
    page.getByRole("button", { name: "Delete account permanently" }),
  ).toBeDisabled();
  await page.getByLabel("Confirmation", { exact: true }).fill("DELETE");
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();
  await expect(page).toHaveURL("http://localhost:3000/");
  expect(await db().user.findUnique({ where: { id: userId } })).toBeNull();
  expect((await page.request.get("/api/monitors")).status()).toBe(401);
});
