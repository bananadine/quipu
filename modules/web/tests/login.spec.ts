import { test, expect } from "../src/fixtures/web.fixtures.js";

test.describe("login - web flow", () => {
  test("happy: valid credentials land on the accounts overview", async ({
    loginPage,
    overviewPage,
    region,
  }) => {
    await loginPage.goto();
    await loginPage.loginAs(
      region.testData.primaryUser.username,
      region.testData.primaryUser.password
    );

    await overviewPage.isVisible();

    const accountIds = await overviewPage.listAccountIds();
    expect(accountIds.length).toBeGreaterThan(0);
  });

  test("error: invalid credentials surface an inline error", async ({
    loginPage,
    region,
  }) => {
    await loginPage.goto();
    await loginPage.loginAs(
      region.testData.invalidUser.username,
      region.testData.invalidUser.password
    );

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText(/error|invalid|could not be verified/i);
  });
});
