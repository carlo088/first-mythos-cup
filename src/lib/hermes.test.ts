import { describe, expect, it } from "vitest";
import { hermesAccessToken, isAuthorizedHermesRequest } from "./hermes";

describe("Hermes authentication", () => {
  it("accepts only the derived bearer token", () => {
    const apiKey = "test-api-key";
    const token = hermesAccessToken(apiKey);
    expect(isAuthorizedHermesRequest(`Bearer ${token}`, apiKey)).toBe(true);
    expect(isAuthorizedHermesRequest("Bearer wrong", apiKey)).toBe(false);
    expect(isAuthorizedHermesRequest(null, apiKey)).toBe(false);
  });
});

