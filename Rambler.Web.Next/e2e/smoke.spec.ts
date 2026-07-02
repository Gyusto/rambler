import { test, expect } from "@playwright/test";

test.describe("Rambler smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");

    // Hero headline text.
    await expect(page.getByText("Where conversations")).toBeVisible();

    // A link out to the project's GitHub repo is present.
    const githubLink = page
      .locator('a[href="https://github.com/8labs/rambler"]')
      .first();
    await expect(githubLink).toHaveCount(1);
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/tos");

    await expect(page.getByText("Terms of Service").first()).toBeVisible();
  });

  test("guest login navigates to chat", async ({ page }) => {
    await page.goto("/login");

    const nick = `Guest${Date.now()}`;

    // Fill the guest nickname field and submit via the "Guest" button.
    await page.getByPlaceholder("Pick a nickname").fill(nick);
    await page.getByRole("button", { name: "Guest" }).click();

    // We should land in the chat and see the composer.
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByPlaceholder("Just ramble away…")).toBeVisible();
  });
});
