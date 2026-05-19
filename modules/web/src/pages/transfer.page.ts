import type { Locator } from "@playwright/test";
import { BasePage } from "./base.page.js";

export class TransferPage extends BasePage {
  public readonly amountInput: Locator = this.page.locator(
    'input[id="amount"]'
  );
  public readonly fromSelect: Locator = this.page.locator(
    "select#fromAccountId"
  );
  public readonly toSelect: Locator = this.page.locator(
    "select#toAccountId"
  );
  public readonly submitButton: Locator = this.page.locator(
    'input.button[type="submit"]'
  );
  public readonly confirmation: Locator = this.page.locator(
    "#showResult h1.title, #showResult"
  );
  public readonly errorPanel: Locator = this.page.locator(
    "#showError, .error"
  );

  async goto(): Promise<void> {
    await this.page.goto(this.url("/transfer.htm"));
  }

  async getAvailableAccountIds(): Promise<number[]> {
    await this.fromSelect.locator('option').first().waitFor({ state: 'attached' });
    const options = await this.fromSelect.locator('option').allInnerTexts();
    return options.map(text => Number(text.trim())).filter(n => Number.isFinite(n));
  }

  // Account IDs are stringly-typed in the underlying <select>.
  async submitTransfer(
    fromAccountId: number,
    toAccountId: number,
    amount: number
  ): Promise<void> {
    await this.amountInput.fill(String(amount));
    await this.fromSelect.locator('option').first().waitFor({ state: 'attached' });
    await this.fromSelect.selectOption(String(fromAccountId));
    await this.toSelect.locator('option').first().waitFor({ state: 'attached' });
    await this.toSelect.selectOption(String(toAccountId));
    await this.submitButton.click();
    // Wait for either confirmation or error panel to be populated/changed
    await this.page.waitForLoadState('networkidle');
  }

  async confirmationText(): Promise<string> {
    await this.confirmation.first().waitFor();
    return (await this.confirmation.first().innerText()).trim();
  }

  async errorVisible(): Promise<boolean> {
    return await this.errorPanel.first().isVisible();
  }

  async errorText(): Promise<string | null> {
    const errorPanel = this.page.locator("#showError");
    await errorPanel.waitFor({ state: 'visible' });
    const errorMsg = await errorPanel.locator("p.error").innerText();
    return errorMsg.trim();
  }
}
