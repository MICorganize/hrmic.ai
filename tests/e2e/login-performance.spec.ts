import { expect, test } from "@playwright/test";

test("the site root renders the login shell without a redirect", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByText("กำลังโหลด…", { exact: true })).toHaveCount(0);
});

for (const path of ["/login", "/company-management/login"]) {
  test(`${path} renders the login shell before loading its company directory`, async ({ page }) => {
    const companyDirectoryResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/public-company-data"
    );

    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
    await companyDirectoryResponse;
  });
}

test("employee login leaves the company unselected for the user to choose by code", async ({ page }) => {
  const companyDirectoryResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/public-company-data"
  );

  await page.goto("/login");
  await companyDirectoryResponse;

  await expect(page.getByRole("button", { name: "เลือกบริษัท" })).toBeEnabled();
});

test("registration lets the user choose a company by code", async ({ page }) => {
  const companyDirectoryResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/public-company-data"
  );

  await page.goto("/register");
  await companyDirectoryResponse;

  await expect(page.getByRole("button", { name: "เลือกบริษัท" })).toBeEnabled();
});

test("registration rejects incomplete account details", async ({ request }) => {
  const response = await request.post("/api/register", { data: {} });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "invalidInput" });
});

test("public company directory advertises browser and CDN cache lifetimes", async ({ request }) => {
  const response = await request.get("/public-company-data");

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("max-age=600");
  expect(response.headers()["cache-control"]).toContain("stale-while-revalidate=86400");
  expect(response.headers()["server-timing"]).toContain("public-company-data");
});
