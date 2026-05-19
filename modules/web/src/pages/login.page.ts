import type { Locator } from "@playwright/test";
import { BasePage } from "./base.page.js";

export class LoginPage extends BasePage {
  public readonly usernameInput: Locator = this.page.locator(
    'input[name="username"]'
  );
  public readonly passwordInput: Locator = this.page.locator(
    'input[name="password"]'
  );
  public readonly submitButton: Locator = this.page.locator(
    'input[type="submit"][value="Log In"]'
  );
  public readonly errorMessage: Locator = this.page.locator(
    "#rightPanel .error, p.error"
  );

  async goto(): Promise<void> {
    await this.page.goto(this.url("/index.htm"));
  }

  async loginAs(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Read the first visible error message, if any. */
  async errorText(): Promise<string | null> {
    const count = await this.errorMessage.count();
    if (count === 0) return null;
    return (await this.errorMessage.first().innerText()).trim();
  }
}
