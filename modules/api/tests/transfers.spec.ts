import { test, expect } from "../src/fixtures/api.fixtures.js";

// ParaBank's demo DB is shared - other testers hit the same accounts,
// so asserting absolute balances is flaky. Use unique amounts instead.
function uniqueAmount(): number {
  return Math.round((Math.random() * 0.99 + 0.5) * 100) / 100;
}

test.describe("transfers - funds movement", () => {
  test("happy: transfer between two of the customer's accounts is recorded in history", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const accounts = await authedClient.getAccountsForCustomer(customerId);
    expect(accounts.length).toBeGreaterThanOrEqual(2);

    const [from, to] = accounts;
    const amount = uniqueAmount();

    const result = await authedClient.transfer(from!.id, to!.id, amount);
    expect(result.amount).toBe(amount);
    expect(result.message.toLowerCase()).toContain("transfer");

    // Verify via transaction history - immune to other testers' activity.
    const matches = await authedClient.findTransactionsByAmount(from!.id, amount);
    expect(
      matches.length,
      `expected exactly one debit of ${amount} on account ${from!.id} after transfer`
    ).toBe(1);
    expect(matches[0]!.amount).toBe(amount);
  });

  test("error state: zero-amount transfer is not accepted", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const [from, to] = await authedClient.getAccountsForCustomer(customerId);
    expect(from && to).toBeTruthy();

    const before = await authedClient.findTransactionsByAmount(from!.id, 0);
    const res = await authedClient.transferRaw(from!.id, to!.id, 0);

    // BUG: application currently allows zero-amount transfers. We assert
    // the desired behaviour: the API should reject zero-value transfers.
    expect(res.ok(), "zero-amount transfers should be rejected").toBe(false);

    const after = await authedClient.findTransactionsByAmount(from!.id, 0);
    expect(
      after.length - before.length,
      "no new zero-amount debit should be created for a rejected transfer"
    ).toBe(0);
  });

  test("idempotency: concurrent identical transfers each create a distinct debit", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const [from, to] = await authedClient.getAccountsForCustomer(customerId);
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();

    const amount = uniqueAmount();
    const before = await authedClient.findTransactionsByAmount(from!.id, amount);

    // Simulate a rapid double-click by firing both transfers concurrently.
    await Promise.all([
      authedClient.transfer(from!.id, to!.id, amount),
      authedClient.transfer(from!.id, to!.id, amount),
    ]);

    const after = await authedClient.findTransactionsByAmount(from!.id, amount);
    // ParaBank is not idempotent - both go through.
    expect(after.length - before.length).toBe(2);
  });

  test("edge case: transfer from an account to itself", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const accounts = await authedClient.getAccountsForCustomer(customerId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);

    const account = accounts[0]!;
    const amount = uniqueAmount();
    const before = await authedClient.findTransactionsByAmount(account.id, amount);

    const res = await authedClient.transferRaw(account.id, account.id, amount);

    expect(res.ok(), "self-transfers should be rejected").toBe(false);

    const after = await authedClient.findTransactionsByAmount(account.id, amount);
    expect(
      after.length - before.length,
      "no transaction should be created for a rejected self-transfer"
    ).toBe(0);
  });
});
