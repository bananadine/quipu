import type { Page } from "@playwright/test";
import type { RegionConfig } from "@quipu/core";

export abstract class BasePage {
  constructor(
    public readonly page: Page,
    protected readonly region: RegionConfig
  ) {}

  protected url(path: string): string {
    const base = this.region.webBaseUrl.replace(/\/+$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }
}
