import { config } from "dotenv";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
config({ path: ".env.test", quiet: true });
if (
  !process.env.DATABASE_URL ||
  new URL(process.env.DATABASE_URL).pathname !== "/uptimeforge_test"
)
  throw new Error("Screenshots require the isolated test database");
const { db } = await import("../src/lib/db");
const { reserveManualJob, runCheckJob } =
  await import("../src/features/checks/jobs");
const { saveStatusPage } = await import("../src/features/status-pages/service");
const user = await db().user.create({ data: { name: "Portfolio demo" } });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const ids: string[] = [];
  for (const [index, name] of [
    "Website",
    "Public API",
    "Background worker",
  ].entries()) {
    const monitor = await db().monitor.create({
      data: {
        userId: user.id,
        name,
        url: `https://example.com/${index}`,
        normalizedUrl: `https://example.com/${index}`,
        status: index === 2 ? "PAUSED" : "PENDING",
        nextCheckAt: index === 2 ? null : new Date(Date.now() + 3600000),
      },
    });
    ids.push(monitor.id);
    if (index === 2) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      const job = await reserveManualJob(user.id, monitor.id);
      const startedAt = new Date(Date.now() - (2 - attempt) * 300000);
      await runCheckJob(job.id, async () => ({
        startedAt,
        finishedAt: new Date(startedAt.getTime() + 87),
        durationMs: 87,
        result: index === 0 ? "SUCCESS" : "HTTP_ERROR",
        httpStatus: index === 0 ? 200 : 503,
        errorCode: index === 0 ? null : "HTTP_ERROR",
        errorMessage: index === 0 ? null : "Endpoint returned HTTP 503",
      }));
    }
  }
  const slug = `portfolio-${randomUUID().slice(0, 8)}`;
  await saveStatusPage(user.id, {
    name: "UptimeForge demo services",
    slug,
    description:
      "Local demonstration with controlled fixture data. Not production measurements.",
    isPublished: true,
    monitors: ids.map((monitorId) => ({ monitorId })),
  });
  const token = randomUUID();
  await db().session.create({
    data: {
      userId: user.id,
      sessionToken: token,
      expires: new Date(Date.now() + 3600000),
    },
  });
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
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
  const page = await context.newPage();
  await mkdir("docs/screenshots", { recursive: true });
  for (const [name, path] of [
    ["landing", "/"],
    ["dashboard", "/dashboard"],
    ["monitor", `/dashboard/monitors/${ids[0]}`],
    ["status-page", `/status/${slug}`],
  ]) {
    const response = await page.goto(`http://localhost:3000${path}`);
    if (response?.status() !== 200)
      throw new Error(`Screenshot page ${name} failed`);
    await page.locator("h1").first().waitFor();
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
    });
  }
  await page.goto("http://localhost:3000/dashboard");
  await page.getByLabel("Color theme").selectOption("dark");
  await page.screenshot({
    path: "docs/screenshots/dashboard-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://localhost:3000/status/${slug}`);
  await page.screenshot({
    path: "docs/screenshots/status-mobile.png",
    fullPage: true,
  });
  console.info(
    "Saved six screenshots from local fixtures; no provider verification claimed.",
  );
} finally {
  await browser?.close();
  await db().user.deleteMany({ where: { id: user.id } });
  await db().$disconnect();
}
