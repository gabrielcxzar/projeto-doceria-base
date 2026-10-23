import { expect, test } from "@playwright/test";
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
  expect(data.icons.some((i: { sizes: string }) => i.sizes === "192x192")).toBe(
    true,
  );
  expect(data.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(
    true,
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names)
      for (const request of await (await caches.open(name)).keys())
        urls.push(request.url);
    return urls;
  });
  expect(cached.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  await context.setOffline(false);
});
