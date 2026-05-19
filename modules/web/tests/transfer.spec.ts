import { test, expect } from "../src/fixtures/web.fixtures.js";

function uniqueAmount(): number {
  return Math.round((Math.random() * 0.99 + 1.5) * 100) / 100;
}

test.describe("transfer - web flow", () => {
  test("happy: UI transfer is reflected in API transaction history", async ({
    loggedInPage,
    apiClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const amount = uniqueAmount();

    // API: authenticate before making API calls
    await apiClient.login(
      region.testData.primaryUser.username,
      region.testData.primaryUser.password
    );

    // API: pick two accounts, snapshot the matching-amount transactions.
    const accounts = await apiClient.getAccountsForCustomer(customerId);
    expect(accounts.length).toBeGreaterThanOrEqual(2);
    const [from, to] = accounts;
    const before = await apiClient.findTransactionsByAmount(from!.id, amount);

    // UI: drive the transfer.
    await loggedInPage.transfer.goto();
    await loggedInPage.transfer.submitTransfer(from!.id, to!.id, amount);
    const confirmation = await loggedInPage.transfer.confirmationText();
    expect(confirmation.toLowerCase()).toContain("transfer complete");

    // API: independent verification - our specific debit appeared.
    const after = await apiClient.findTransactionsByAmount(from!.id, amount);
    expect(
      after.length - before.length,
      "exactly one new debit of " + amount + " should appear on the source account"
    ).toBe(1);
  });

  test("idempotency: double-clicking submit creates two distinct debits", async ({
    loggedInPage,
    apiClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const amount = uniqueAmount();

    await apiClient.login(
      region.testData.primaryUser.username,
      region.testData.primaryUser.password
    );

    const accounts = await apiClient.getAccountsForCustomer(customerId);
    expect(accounts.length).toBeGreaterThanOrEqual(2);
    const [from, to] = accounts;
    const before = await apiClient.findTransactionsByAmount(from!.id, amount);

    await loggedInPage.transfer.goto();
    await loggedInPage.transfer.amountInput.fill(String(amount));
    await loggedInPage.transfer.fromSelect.locator("option").first().waitFor({ state: "attached" });
    await loggedInPage.transfer.fromSelect.selectOption(String(from!.id));
    await loggedInPage.transfer.toSelect.locator("option").first().waitFor({ state: "attached" });
    await loggedInPage.transfer.toSelect.selectOption(String(to!.id));
    // Double-click simulates a rapid re-submission before the first request settles.
    await loggedInPage.transfer.submitButton.dblclick();
    await loggedInPage.transfer.page.waitForLoadState("networkidle");

    const after = await apiClient.findTransactionsByAmount(from!.id, amount);
    expect(
      after.length - before.length,
      "double-click submit should create two distinct debits (ParaBank is not idempotent)"
    ).toBe(2);
  });

  test("error state: transfer form rejects non-numeric amount client-side", async ({
    loggedInPage,
  }) => {
    await loggedInPage.transfer.goto();

    const accounts = await loggedInPage.transfer.getAvailableAccountIds();
    const fromAccount = accounts[0];
    const toAccount = accounts[accounts.length > 1 ? 1 : 0];

    await loggedInPage.transfer.submitTransfer(fromAccount!, toAccount!, NaN as unknown as number);

    const errorText = await loggedInPage.transfer.errorText();
    expect(errorText).toContain("An internal error has occurred and has been logged");
  });
});
