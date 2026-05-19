import { test, expect } from "../src/fixtures/web.fixtures.js";

// API does the transfer setup; only the verification touches the browser.
// Uses a unique amount rather than a balance delta to stay robust against concurrent testers.
function uniqueAmount(): number {
  return Math.round((Math.random() * 0.99 + 2.5) * 100) / 100;
}

test("UI overview lists the destination account after an API-driven transfer", async ({
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
  const beforeTxns = await apiClient.findTransactionsByAmount(to!.id, amount);
  await apiClient.transfer(from!.id, to!.id, amount);

  await loggedInPage.overview.goto();
  const accountIds = await loggedInPage.overview.listAccountIds();
  expect(accountIds).toContain(to!.id);

  const afterTxns = await apiClient.findTransactionsByAmount(to!.id, amount);
  expect(
    afterTxns.length - beforeTxns.length,
    "destination account should show one new credit of " + amount
  ).toBe(1);
});
