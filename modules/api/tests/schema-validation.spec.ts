import { test, expect } from "../src/fixtures/api.fixtures.js";
import { AccountListSchema, AccountSchema } from "../src/schemas/account.schema.js";
import { CustomerSchema } from "../src/schemas/customer.schema.js";
import { TransactionListSchema } from "../src/schemas/transaction.schema.js";
import { parseOrThrow } from "../src/clients/parabank.client.js";

/**
 * Schema-validation tests using zod and parseOrThrow to verify that responses match our expected contracts.
 */
test.describe("schema validation - response contracts", () => {
  test("customer profile matches CustomerSchema", async ({ authedClient, region }) => {
    const customerId = region.testData.primaryUser.customerId!;

    // Use the raw fetch path so parseOrThrow can produce the rich error.
    const res = await authedClient["request"].get(
      `${region.apiBaseUrl}/customers/${customerId}`
    );
    expect(res.ok()).toBe(true);

    const customer = await parseOrThrow(res, CustomerSchema, "GET /customers/:id");
    expect(customer.id).toBe(customerId);
  });

  test("accounts list matches AccountListSchema", async ({ authedClient, region }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const res = await authedClient["request"].get(
      `${region.apiBaseUrl}/customers/${customerId}/accounts`
    );
    expect(res.ok()).toBe(true);
    const accounts = await parseOrThrow(
      res,
      AccountListSchema,
      "GET /customers/:id/accounts"
    );
    expect(accounts.length).toBeGreaterThan(0);
  });

  test("single account matches AccountSchema", async ({ authedClient, region }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const accounts = await authedClient.getAccountsForCustomer(customerId);
    const accountId = accounts[0]!.id;

    const res = await authedClient["request"].get(
      `${region.apiBaseUrl}/accounts/${accountId}`
    );
    expect(res.ok()).toBe(true);
    await parseOrThrow(res, AccountSchema, "GET /accounts/:id");
  });

  test("transactions list matches TransactionListSchema", async ({
    authedClient,
    region,
  }) => {
    const customerId = region.testData.primaryUser.customerId!;
    const accounts = await authedClient.getAccountsForCustomer(customerId);
    const accountId = accounts[0]!.id;

    const res = await authedClient["request"].get(
      `${region.apiBaseUrl}/accounts/${accountId}/transactions`
    );
    expect(res.ok()).toBe(true);
    // An empty array is a valid response; zod still validates the shape.
    await parseOrThrow(res, TransactionListSchema, "GET /accounts/:id/transactions");
  });
});
