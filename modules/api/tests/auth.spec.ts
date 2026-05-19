import { test, expect } from "../src/fixtures/api.fixtures.js";

test.describe("auth - login contract", () => {
  test("happy: valid credentials establish a session", async ({ apiClient, region }) => {
    const { username, password } = region.testData.primaryUser;

    const res = await apiClient.login(username, password);

    // ParaBank redirects to /overview.htm on success.
    expect(
      res.status(),
      `Expected 3xx redirect from successful login, got ${res.status()}`
    ).toBe(302);
  });

  test("error: invalid credentials are rejected", async ({ apiClient, region }) => {
    const { username, password } = region.testData.invalidUser;

    const res = await apiClient.login(username, password);

    // ParaBank re-renders the login page (200) rather than returning 401, so we check the body for error messages instead.
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/error|invalid|could not be verified/);
  });
});
