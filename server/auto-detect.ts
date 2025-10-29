import Papa from "papaparse";
import fs from "fs/promises";

/**
 * Auto-detect problem type (classification vs regression)
 * based on target column characteristics
 */

export type ProblemType = "classification" | "regression";

export interface DetectionResult {
  problemType: ProblemType;
  targetColumn: string;
  uniqueValues: number;
  dataType: "numeric" | "categorical" | "mixed";
  recommendation: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Detect problem type from CSV file
 */
export async function detectProblemType(
  filePath: string,
  targetColumn: string
): Promise<DetectionResult> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const parsed = Papa.parse(fileContent, { header: true, dynamicTyping: true });
  
  const data = parsed.data as Record<string, any>[];
  const cleanData = data.filter(row => row[targetColumn] != null);
  
  if (cleanData.length === 0) {
    throw new Error(`No valid data found for target column: ${targetColumn}`);
  }

  // Get target values
  const targetValues = cleanData.map(row => row[targetColumn]);
  
  // Count unique values
  const uniqueValues = new Set(targetValues).size;
  const totalValues = targetValues.length;
  const uniqueRatio = uniqueValues / totalValues;
  
  // Check data types
  const numericCount = targetValues.filter(v => typeof v === "number").length;
  const stringCount = targetValues.filter(v => typeof v === "string").length;
  
  let dataType: "numeric" | "categorical" | "mixed";
  if (numericCount === totalValues) {
    dataType = "numeric";
  } else if (stringCount === totalValues) {
    dataType = "categorical";
  } else {
    dataType = "mixed";
  }
  
  // Decision logic
  let problemType: ProblemType;
  let recommendation: string;
  let confidence: "high" | "medium" | "low";
  
  // Rule 1: String/categorical data → Classification
  if (dataType === "categorical") {
    problemType = "classification";
    recommendation = `Target column contains categorical data (${uniqueValues} unique classes). Classification is recommended.`;
    confidence = "high";
  }
  // Rule 2: Very few unique numeric values → Classification
  else if (dataType === "numeric" && uniqueValues <= 10 && uniqueRatio < 0.05) {
    problemType = "classification";
    recommendation = `Target column has only ${uniqueValues} unique numeric values (${(uniqueRatio * 100).toFixed(1)}% of data). This suggests discrete classes. Classification is recommended.`;
    confidence = "high";
  }
  // Rule 3: Many unique numeric values → Regression
  else if (dataType === "numeric" && uniqueRatio > 0.1) {
    problemType = "regression";
    recommendation = `Target column has ${uniqueValues} unique numeric values (${(uniqueRatio * 100).toFixed(1)}% of data). This suggests continuous values. Regression/Forecasting is recommended.`;
    confidence = "high";
  }
  // Rule 4: Moderate unique values → Ambiguous (default to regression)
  else if (dataType === "numeric") {
    problemType = "regression";
    recommendation = `Target column has ${uniqueValues} unique numeric values. Could be either classification or regression. Defaulting to regression, but you may want to try classification if these represent discrete categories.`;
    confidence = "medium";
  }
  // Rule 5: Mixed data types → Classification (safer default)
  else {
    problemType = "classification";
    recommendation = `Target column has mixed data types. Classification is recommended as a safer default.`;
    confidence = "low";
  }
  
  return {
    problemType,
    targetColumn,
    uniqueValues,
    dataType,
    recommendation,
    confidence,
  };
}

/**
 * Get recommended models based on problem type
 */
export function getRecommendedModels(problemType: ProblemType): string[] {
  if (problemType === "classification") {
    return [
      "logistic_regression",
      "random_forest_classifier",
    ];
  } else {
    return [
      "linear",
      "polynomial",
      "random_forest",
    ];
  }
}

/**
 * Get metric names based on problem type
 */
export function getMetricNames(problemType: ProblemType): string[] {
  if (problemType === "classification") {
    return ["accuracy", "precision", "recall", "f1_score"];
  } else {
    return ["rmse", "mae", "r2", "mape"];
  }
}
