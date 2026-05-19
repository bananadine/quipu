import { test, expect } from "../src/fixtures/api.fixtures.js";

test.describe("accounts - retrieval", () => {
  test("happy: authenticated customer has at least one account", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const accounts = await authedClient.getAccountsForCustomer(customerId);

    expect(accounts.length).toBeGreaterThan(0);

    for (const account of accounts) {
      expect(account.customerId).toBe(customerId);
      expect(["CHECKING", "SAVINGS", "LOAN"]).toContain(account.type);
    }
  });

  test("happy: individual account fetch matches list entry", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const [first] = await authedClient.getAccountsForCustomer(customerId);
    expect(first, "customer should have at least one account").toBeDefined();

    const fetched = await authedClient.getAccount(first!.id);

    expect(fetched.id).toBe(first!.id);
    expect(fetched.customerId).toBe(first!.customerId);
    expect(fetched.type).toBe(first!.type);
    // Balance can drift between list-fetch and detail-fetch if another test
    // is mutating in parallel, so we only assert it's a number.
    expect(typeof fetched.balance).toBe("number");
  });

  test("error: requesting an account that doesn't exist returns an error", async ({
    authedClient,
  }) => {
    const res = await authedClient.getAccountRaw(999_999_999);
    expect(res.ok()).toBe(false);
  });
});
