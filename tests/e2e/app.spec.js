import { test, expect } from "@playwright/test";
const password = process.env.DEMO_PASSWORD;
async function signIn(page, n = 1) {
  await page.goto("/login");
  await page.getByRole("button", { name: `Demo ${n}`, exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTestId("property-card").first()).toBeVisible({
    timeout: 60000,
  });
}
test("real login, combined filters, normalized sorting, pagination and deep-link refresh", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page).toHaveURL(/page=1/);
  await page.getByLabel("Locality", { exact: true }).selectOption("balewadi");
  await page.getByRole("button", { name: "Filters", exact: false }).click();
  await page.getByLabel("Bedrooms", { exact: true }).selectOption("2");
  await page
    .getByLabel("Furnishing", { exact: true })
    .selectOption("semi-furnished");
  await page.getByLabel("Minimum price").fill("7000000");
  await page.getByLabel("Maximum price").fill("13000000");
  await page.getByLabel("Sort by").selectOption("price-asc");
  const catalog = await (await page.request.get("/api/catalog")).json();
  const expected = catalog.listings
    .filter(
      (x) =>
        x.locality === "balewadi" &&
        x.bedroom === 2 &&
        x.furnishing === "semi-furnished" &&
        x.price_inr >= 7000000 &&
        x.price_inr <= 13000000 &&
        x.is_live &&
        !x.suspected_fake &&
        !x.corrupt_reasons.length,
    )
    .sort((a, b) => a.price_inr - b.price_inr);
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.getByTestId("property-card")).toHaveCount(
    Math.min(expected.length, 9),
  );
  const first = page.getByTestId("property-card").first();
  await expect(first.locator("h3 a")).toHaveAttribute(
    "href",
    `/homes/${expected[0].listing_id}`,
  );
  await expect(first).toContainText("2 BHK");
  await first.locator("h3 a").click();
  await page.reload();
  await expect(page.locator(".record-id")).toHaveText(expected[0].listing_id);
  await expect(
    page.getByRole("heading", { name: "Property details" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("all three accounts work; favourites survive reload and re-login and remain isolated", async ({
  page,
  browser,
}) => {
  await signIn(page, 1);
  const first = page.getByTestId("property-card").first();
  const url = await first.locator("h3 a").getAttribute("href");
  const id = url.split("/").at(-1);
  const original = await (await page.request.get("/api/saved")).json();
  const initiallySaved = original.results.some((x) => x.listing_id === id);
  const second = await browser.newPage();
  const third = await browser.newPage();
  try {
    if (initiallySaved) await page.request.delete("/api/saved/" + id);
    await page.reload();
    await expect(
      first.getByRole("button", { name: "Save home", exact: true }),
    ).toBeVisible();
    await first.getByRole("button", { name: "Save home", exact: true }).click();
    await expect(
      first.getByRole("button", { name: "Unsave home" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Saved homes", exact: true }).click();
    await expect(page.locator(`h3 a[href="${url}"]`)).toBeVisible();
    await page.reload();
    await expect(page.locator(`h3 a[href="${url}"]`)).toBeVisible();
    await signIn(second, 2);
    const s2 = await (await second.request.get("/api/saved")).json();
    expect(s2.results.some((x) => x.listing_id === id)).toBe(false);
    await signIn(third, 3);
    await expect(third.locator(".sidebar-bottom")).toContainText("demo3");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/login/);
    await signIn(page, 1);
    await page.getByRole("link", { name: "Saved homes", exact: true }).click();
    await expect(page.locator(`h3 a[href="${url}"]`)).toBeVisible();
    await page
      .locator(`article:has(h3 a[href="${url}"])`)
      .getByRole("button", { name: "Unsave home" })
      .click();
    await expect(page.locator(`h3 a[href="${url}"]`)).toHaveCount(0);
  } finally {
    if (initiallySaved)
      await page.request.post("/api/saved", { data: { listing_id: id } });
    else await page.request.delete("/api/saved/" + id);
    await second.close();
    await third.close();
  }
});
test("missing/expired access token refreshes from the real refresh cookie, including concurrent requests", async ({
  page,
  context,
}) => {
  await signIn(page);
  const cookies = await context.cookies();
  const refresh = cookies.find((x) => x.name === "ivy_refresh");
  expect(refresh.httpOnly).toBe(true);
  await context.clearCookies();
  await context.addCookies([refresh]);
  const responses = await Promise.all([
    page.request.get("/api/session"),
    page.request.get("/api/saved"),
    page.request.get("/api/catalog"),
  ]);
  for (const response of responses) expect(response.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  expect(
    (await context.cookies()).some(
      (x) => x.name === "ivy_access" && x.httpOnly,
    ),
  ).toBe(true);
});
test("rental/project prices, insights, quality warnings and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await page.getByRole("button", { name: "Rent a home", exact: true }).click();
  await page.getByLabel("Locality", { exact: true }).selectOption("balewadi");
  await expect(page.getByTestId("property-card").first()).toContainText(
    "/ month",
  );
  await page.getByTestId("property-card").first().locator("h3 a").click();
  await expect(
    page.getByText("Security deposit", { exact: true }),
  ).toBeVisible();
  await page.goto("/projects/P30288");
  await expect(page.locator(".price-panel")).toContainText("₹4.47 Cr");
  await expect(page.getByText("RERA number", { exact: true })).toBeVisible();
  await page.goto("/homes/100-3000174");
  await expect(page.locator(".quality-alert")).toContainText(
    "Non-positive asking price",
  );
  await page.goto("/insights");
  await expect(
    page.getByRole("heading", { name: "A little insight. A better move." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Assignment answers", exact: true })
    .click();
  await expect(page.locator(".answers-panel")).toContainText("3,800");
  await expect(page.locator(".answers-panel")).toContainText("₹10859.32");
  await page.getByRole("button", { name: "Data quality", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "95 project counts don’t add up" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/homes");
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Saved homes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your shortlist. Your possibilities." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("invalid credentials show a recoverable error and unauthenticated deep links are preserved", async ({
  page,
}) => {
  await page.goto("/homes/DWE-3002501");
  await expect(page).toHaveURL(/login/);
  await page.getByRole("button", { name: "Demo 1", exact: true }).click();
  await page
    .getByLabel("Password", { exact: true })
    .fill("deliberately-wrong-once");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/homes/DWE-3002501");
  await expect(page.locator(".record-id")).toHaveText("DWE-3002501");
});
