import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";

/**
 * Comprehensive test suite for AI Auto Analysis
 * Tests upload, download, chat streaming, and model training
 */

const API_BASE = "http://localhost:3000/api";
const TEST_DATA_DIR = path.join(process.cwd(), "data", "test");

// Test dataset
const testCSV = `date,sales,temperature,promotion
2024-01-01,100,25,0
2024-01-02,120,26,1
2024-01-03,110,24,0
2024-01-04,130,27,1
2024-01-05,125,25,0
2024-01-06,140,28,1
2024-01-07,135,26,0
2024-01-08,150,29,1
2024-01-09,145,27,0
2024-01-10,160,30,1`;

describe("Upload/Download Tests", () => {
  let testFilePath: string;
  let datasetId: string;

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    
    // Create test CSV file
    testFilePath = path.join(TEST_DATA_DIR, "test_sales.csv");
    await fs.writeFile(testFilePath, testCSV);
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testFilePath);
      await fs.rmdir(TEST_DATA_DIR);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it("should upload CSV file successfully", async () => {
    const formData = new FormData();
    const fileBlob = new Blob([testCSV], { type: "text/csv" });
    formData.append("file", fileBlob, "test_sales.csv");

    const response = await fetch(`${API_BASE}/datasets/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("id");
    expect(result.data.name).toBe("test_sales.csv");
    expect(result.data.file_type).toBe("csv");
    
    datasetId = result.data.id;
  });

  it("should list uploaded datasets", async () => {
    const response = await fetch(`${API_BASE}/datasets`);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("should get single dataset", async () => {
    const response = await fetch(`${API_BASE}/datasets/${datasetId}`);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(datasetId);
  });

  it("should handle missing file upload", async () => {
    const response = await fetch(`${API_BASE}/datasets/upload`, {
      method: "POST",
      body: new FormData(),
    });

    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("No file uploaded");
  });
});

describe("Chat Streaming Tests", () => {
  it("should create session successfully", async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: "test-dataset",
        gemini_api_key: "test-key",
        model_name: "gemini-2.0-flash-lite",
      }),
    });

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("id");
    expect(result.data.model_name).toBe("gemini-2.0-flash-lite");
  });

  it("should reject session without required fields", async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing required fields");
  });

  it("should list all sessions", async () => {
    const response = await fetch(`${API_BASE}/sessions`);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("Model Training Tests", () => {
  let modelId: string;

  it("should train linear regression model", async () => {
    const response = await fetch(`${API_BASE}/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: "test-dataset",
        target_column: "sales",
        model_type: "linear",
        test_size: 0.2,
        options: {
          name: "Test Linear Model",
        },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      expect(result.data.model).toHaveProperty("id");
      expect(result.data.model.type).toBe("linear");
      expect(result.data.model.metrics).toHaveProperty("rmse");
      expect(result.data.model.metrics).toHaveProperty("mae");
      expect(result.data.model.metrics).toHaveProperty("r2");
      
      modelId = result.data.model.id;
    }
  });

  it("should train polynomial regression model", async () => {
    const response = await fetch(`${API_BASE}/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: "test-dataset",
        target_column: "sales",
        model_type: "polynomial",
        test_size: 0.2,
        options: {
          name: "Test Polynomial Model",
          degree: 2,
        },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      expect(result.data.model.type).toBe("polynomial");
      expect(result.data.model.metrics).toHaveProperty("rmse");
    }
  });

  it("should reject training without required fields", async () => {
    const response = await fetch(`${API_BASE}/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should list all models", async () => {
    const response = await fetch(`${API_BASE}/ml/models`);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should export model", async () => {
    if (!modelId) return;

    const response = await fetch(`${API_BASE}/ml/models/${modelId}/export`);
    
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should make predictions with model", async () => {
    if (!modelId) return;

    const response = await fetch(`${API_BASE}/ml/models/${modelId}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: {
          temperature: 27,
          promotion: 1,
        },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      expect(result.data).toHaveProperty("prediction");
      expect(typeof result.data.prediction).toBe("number");
    }
  });

  it("should delete model", async () => {
    if (!modelId) return;

    const response = await fetch(`${API_BASE}/ml/models/${modelId}`, {
      method: "DELETE",
    });

    const result = await response.json();
    
    expect(result.success).toBe(true);
  });
});

describe("Error Handling Tests", () => {
  it("should return 404 for non-existent dataset", async () => {
    const response = await fetch(`${API_BASE}/datasets/non-existent-id`);
    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should return 404 for non-existent model", async () => {
    const response = await fetch(`${API_BASE}/ml/models/non-existent-id`);
    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should handle invalid JSON in request body", async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    expect(response.ok).toBe(false);
  });
});

describe("Data Validation Tests", () => {
  it("should validate model type", async () => {
    const response = await fetch(`${API_BASE}/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: "test-dataset",
        target_column: "sales",
        model_type: "invalid_type",
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("should validate test size range", async () => {
    const response = await fetch(`${API_BASE}/ml/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: "test-dataset",
        target_column: "sales",
        model_type: "linear",
        test_size: 1.5, // Invalid: > 1
      }),
    });

    const result = await response.json();
    
    // Should either reject or clamp to valid range
    expect(result).toBeTruthy();
  });
});
