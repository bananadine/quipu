import type { APIRequestContext, APIResponse } from "@playwright/test";
import { type RegionConfig } from "@quipu/core";
import { z } from "zod";
import { AccountListSchema, AccountSchema, type Account } from "../schemas/account.schema.js";
import { TransactionListSchema, type TransferResult } from "../schemas/transaction.schema.js";

/**
 * Authentication is established via a POST to `/parabank/login.htm` on the web base URL.
 * The REST proxy endpoints rely on the JSESSIONID cookie set by that call.
 * We encapsulate this here so tests never have to know.
 */
function deriveWebBase(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/services_proxy\/bank\/?$/, "");
}

export class ParaBankClient {
  private readonly webBase: string;

  constructor(
    private readonly request: APIRequestContext,
    private readonly region: RegionConfig
  ) {
    this.webBase = deriveWebBase(region.apiBaseUrl);
  }

  /**
   * Establish an authenticated session.
   *
   * Returns the response from the form POST so callers can distinguish
   * "logged in" (302 redirect) from "rejected" (200 with form re-rendered).
   * The Playwright request context retains cookies across subsequent calls.
   */
  async login(username: string, password: string): Promise<APIResponse> {
    return await this.request.post(`${this.webBase}/login.htm`, {
      form: { username, password },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
  }

  async getAccountsForCustomer(customerId: number): Promise<Account[]> {
    const res = await this.request.get(
      `${this.region.apiBaseUrl}/customers/${customerId}/accounts`,
      { failOnStatusCode: true }
    );
    return AccountListSchema.parse(await res.json());
  }

  async getAccount(accountId: number): Promise<Account> {
    const res = await this.request.get(`${this.region.apiBaseUrl}/accounts/${accountId}`, {
      failOnStatusCode: true,
    });
    return AccountSchema.parse(await res.json());
  }

  async getAccountRaw(accountId: number): Promise<APIResponse> {
    return await this.request.get(`${this.region.apiBaseUrl}/accounts/${accountId}`, {
      failOnStatusCode: false,
    });
  }

  async findTransactionsByAmount(accountId: number, amount: number) {
    const res = await this.request.get(
      `${this.region.apiBaseUrl}/accounts/${accountId}/transactions/amount/${amount}`,
      { failOnStatusCode: false }
    );
    if (!res.ok()) return [];
    return TransactionListSchema.parse(await res.json());
  }

  // ---------- Transfers ----------

  /**
   * ParaBank's transfer endpoint returns plain text, not JSON - we normalise
   * it into a structured object. Not idempotent: two identical calls each
   * produce a distinct debit.
   */
  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<TransferResult> {
    const res = await this.request.post(
      `${this.region.apiBaseUrl}/transfer` +
        `?fromAccountId=${fromAccountId}` +
        `&toAccountId=${toAccountId}` +
        `&amount=${amount}`,
      { failOnStatusCode: false }
    );
    const message = await res.text();
    if (!res.ok()) {
      throw new Error(`Transfer failed: HTTP ${res.status()} - ${message}`);
    }
    return { fromAccountId, toAccountId, amount, message };
  }

  async transferRaw(fromAccountId: number, toAccountId: number, amount: number): Promise<APIResponse> {
    return await this.request.post(
      `${this.region.apiBaseUrl}/transfer` +
        `?fromAccountId=${fromAccountId}` +
        `&toAccountId=${toAccountId}` +
        `&amount=${amount}`,
      { failOnStatusCode: false }
    );
  }
}

export async function parseOrThrow<T>(
  res: APIResponse,
  schema: z.ZodType<T>,
  context: string
): Promise<T> {
  const body = await res.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      `Schema validation failed for ${context}:\n` +
        parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n") +
        `\nReceived: ${JSON.stringify(body, null, 2)}`
    );
  }
  return parsed.data;
}
