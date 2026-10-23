import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
test("produção tem manifesto, service worker, shell offline e nenhum modo demo", async ({
  page,
  context,
  request,
}) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Prévia com dados fictícios", { exact: false }),
  ).toHaveCount(0);
  const manifest = await request.get("/manifest.webmanifest");
  const data = await manifest.json();
  expect(data.display).toBe("standalone");
  expect(data.icons).toEqual([{
    src: "/images/logo.png", sizes: "1024x1024", type: "image/png", purpose: "any",
  }]);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/images/logo.png");
  const original = await readFile("public/images/logo.png");
  const icon = await request.get(data.icons[0].src);
  expect(await icon.body()).toEqual(original);
  // Hash do asset que já existia antes da reformulação: impede substituição silenciosa.
  expect(createHash("sha1").update(`blob ${original.length}\0`).update(original).digest("hex"))
    .toBe("0b344d7417c4f20b811eb09ba2401c080cc64aa3");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  const cdp = await context.newCDPSession(page);
  await expect.poll(async () => (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors)
    .toEqual([]);
  await cdp.detach();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  const logo = page.getByRole("img", { name: "Logo da Lá Divino Sabor" }).filter({ visible: true });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 1024)).toBe(true);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names)
      for (const request of await (await caches.open(name)).keys())
        urls.push(request.url);
    return urls;
  });
  expect(cached.some((url) => new URL(url).pathname === "/images/logo.png")).toBe(true);
  expect(cached.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  await context.setOffline(false);
});
