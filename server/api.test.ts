import { describe, it, expect, beforeAll } from "vitest";

describe("API Endpoints", () => {
  const BASE_URL = "http://localhost:3000";

  describe("Datasets API", () => {
    it("should list datasets", async () => {
      const response = await fetch(`${BASE_URL}/api/datasets`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("Sessions API", () => {
    it("should list sessions", async () => {
      const response = await fetch(`${BASE_URL}/api/sessions`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("ML Models API", () => {
    it("should list models", async () => {
      const response = await fetch(`${BASE_URL}/api/ml/models`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
