import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page.js";

export class OverviewPage extends BasePage {
  public readonly accountsTable: Locator = this.page.locator(
    "#accountTable"
  );

  async goto(): Promise<void> {
    await this.page.goto(this.url("/overview.htm"));
  }

  async listAccountIds(): Promise<number[]> {
    await this.accountsTable.waitFor();
    const links = this.accountsTable.locator('tbody td:first-child a');
    await links.first().waitFor();
    const texts = await links.allInnerTexts();
    return texts.map((t) => Number(t.trim())).filter((n) => Number.isFinite(n));
  }

  async isVisible(): Promise<void> {
    await expect(this.accountsTable).toBeVisible();
  }
}
