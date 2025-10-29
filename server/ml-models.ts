import { SimpleLinearRegression, PolynomialRegression } from "ml-regression";
import { Matrix } from "ml-matrix";
import { RandomForestRegression, RandomForestClassifier } from "ml-random-forest";
import { mean, standardDeviation, min, max } from "simple-statistics";
import Papa from "papaparse";
import fs from "fs/promises";

// Types
export interface TrainingData {
  X: number[][];
  y: number[];
  featureNames: string[];
  targetName: string;
}

export interface ModelMetrics {
  rmse: number;
  mse: number;
  mae: number;
  r2: number;
  mape?: number;
}

export interface TrainedModel {
  id: string;
  name: string;
  type: "linear" | "polynomial" | "random_forest";
  metrics: ModelMetrics;
  model: any;
  featureNames: string[];
  targetName: string;
  trainedAt: string;
  datasetId: string;
  version: number;
  parent_id?: string; // For versioning - points to previous version
  description?: string;
}

export interface TrainingResult {
  model: TrainedModel;
  predictions: number[];
  actual: number[];
  residuals: number[];
  featureImportance?: Record<string, number>;
}

// Load and prepare data from CSV
export async function loadDataFromCSV(filePath: string, targetColumn: string): Promise<TrainingData> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const parsed = Papa.parse(fileContent, { header: true, dynamicTyping: true });
  
  const data = parsed.data as Record<string, any>[];
  const cleanData = data.filter(row => row[targetColumn] != null);
  
  if (cleanData.length === 0) {
    throw new Error(`No valid data found for target column: ${targetColumn}`);
  }

  const featureNames = Object.keys(cleanData[0]).filter(col => col !== targetColumn);
  const numericFeatures = featureNames.filter(name => {
    return typeof cleanData[0][name] === "number";
  });

  if (numericFeatures.length === 0) {
    throw new Error("No numeric features found in dataset");
  }

  const X = cleanData.map(row => 
    numericFeatures.map(feature => {
      const val = row[feature];
      return typeof val === "number" ? val : 0;
    })
  );

  const y = cleanData.map(row => {
    const val = row[targetColumn];
    return typeof val === "number" ? val : 0;
  });

  return {
    X,
    y,
    featureNames: numericFeatures,
    targetName: targetColumn,
  };
}

// Split data into train/test sets
export function trainTestSplit(
  X: number[][],
  y: number[],
  testSize: number = 0.2,
  randomSeed?: number
): { XTrain: number[][], XTest: number[][], yTrain: number[], yTest: number[] } {
  const n = X.length;
  const testCount = Math.floor(n * testSize);
  const trainCount = n - testCount;

  // Simple shuffle
  const indices = Array.from({ length: n }, (_, i) => i);
  if (randomSeed !== undefined) {
    // Simple seeded shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(((randomSeed + i) % 1000) / 1000 * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  } else {
    // Random shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }

  const trainIndices = indices.slice(0, trainCount);
  const testIndices = indices.slice(trainCount);

  return {
    XTrain: trainIndices.map(i => X[i]),
    XTest: testIndices.map(i => X[i]),
    yTrain: trainIndices.map(i => y[i]),
    yTest: testIndices.map(i => y[i]),
  };
}

// Calculate metrics
export function calculateMetrics(actual: number[], predicted: number[]): ModelMetrics {
  const n = actual.length;
  
  // MSE
  const squaredErrors = actual.map((a, i) => Math.pow(a - predicted[i], 2));
  const mse = mean(squaredErrors);
  
  // RMSE
  const rmse = Math.sqrt(mse);
  
  // MAE
  const absoluteErrors = actual.map((a, i) => Math.abs(a - predicted[i]));
  const mae = mean(absoluteErrors);
  
  // R²
  const yMean = mean(actual);
  const totalSS = actual.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const residualSS = squaredErrors.reduce((a, b) => a + b, 0);
  const r2 = 1 - (residualSS / totalSS);
  
  // MAPE (Mean Absolute Percentage Error)
  const percentageErrors = actual.map((a, i) => {
    if (a === 0) return 0;
    return Math.abs((a - predicted[i]) / a) * 100;
  });
  const mape = mean(percentageErrors);

  return { rmse, mse, mae, r2, mape };
}

// Train Linear Regression
export function trainLinearRegression(
  XTrain: number[][],
  yTrain: number[],
  XTest: number[][],
  yTest: number[],
  featureNames: string[],
  targetName: string,
  datasetId: string,
  modelName?: string
): TrainingResult {
  // For multivariate, use first feature or combine
  const xTrain = XTrain.map(row => row[0]);
  const xTest = XTest.map(row => row[0]);

  const regression = new SimpleLinearRegression(xTrain, yTrain);
  const predictions = xTest.map(x => regression.predict(x));
  const metrics = calculateMetrics(yTest, predictions);
  const residuals = yTest.map((y, i) => y - predictions[i]);

  const model: TrainedModel = {
    id: `model-${Date.now()}`,
    name: modelName || `Linear Regression - ${targetName}`,
    type: "linear",
    metrics,
    model: {
      slope: regression.slope,
      intercept: regression.intercept,
      coefficients: [regression.slope],
    },
    featureNames,
    targetName,
    trainedAt: new Date().toISOString(),
    datasetId,
  };

  return {
    model,
    predictions,
    actual: yTest,
    residuals,
  };
}

// Train Polynomial Regression
export function trainPolynomialRegression(
  XTrain: number[][],
  yTrain: number[],
  XTest: number[][],
  yTest: number[],
  degree: number,
  featureNames: string[],
  targetName: string,
  datasetId: string,
  modelName?: string
): TrainingResult {
  const xTrain = XTrain.map(row => row[0]);
  const xTest = XTest.map(row => row[0]);

  const regression = new PolynomialRegression(xTrain, yTrain, degree);
  const predictions = xTest.map(x => regression.predict(x));
  const metrics = calculateMetrics(yTest, predictions);
  const residuals = yTest.map((y, i) => y - predictions[i]);

  const model: TrainedModel = {
    id: `model-${Date.now()}`,
    name: modelName || `Polynomial Regression (degree ${degree}) - ${targetName}`,
    type: "polynomial",
    metrics,
    model: {
      degree,
      coefficients: regression.coefficients,
    },
    featureNames,
    targetName,
    trainedAt: new Date().toISOString(),
    datasetId,
  };

  return {
    model,
    predictions,
    actual: yTest,
    residuals,
  };
}

// Train Random Forest
export function trainRandomForest(
  XTrain: number[][],
  yTrain: number[],
  XTest: number[][],
  yTest: number[],
  featureNames: string[],
  targetName: string,
  datasetId: string,
  options?: { nEstimators?: number; maxDepth?: number },
  modelName?: string
): TrainingResult {
  const rf = new RandomForestRegression({
    nEstimators: options?.nEstimators || 100,
    maxDepth: options?.maxDepth || 10,
    seed: 42,
  });

  rf.train(XTrain, yTrain);
  const predictions = XTest.map(x => rf.predict(x));
  const metrics = calculateMetrics(yTest, predictions);
  const residuals = yTest.map((y, i) => y - predictions[i]);

  // Feature importance (simplified)
  const featureImportance: Record<string, number> = {};
  featureNames.forEach((name, i) => {
    featureImportance[name] = Math.random(); // Placeholder
  });

  const model: TrainedModel = {
    id: `model-${Date.now()}`,
    name: modelName || `Random Forest - ${targetName}`,
    type: "random_forest",
    metrics,
    model: {
      nEstimators: options?.nEstimators || 100,
      maxDepth: options?.maxDepth || 10,
      // Note: ml-random-forest doesn't support serialization well
      // We'll store config only
    },
    featureNames,
    targetName,
    trainedAt: new Date().toISOString(),
    datasetId,
  };

  return {
    model,
    predictions,
    actual: yTest,
    residuals,
    featureImportance,
  };
}

// Auto-select best model
export async function autoTrain(
  filePath: string,
  targetColumn: string,
  datasetId: string,
  testSize: number = 0.2
): Promise<TrainingResult[]> {
  const data = await loadDataFromCSV(filePath, targetColumn);
  const { XTrain, XTest, yTrain, yTest } = trainTestSplit(data.X, data.y, testSize);

  const results: TrainingResult[] = [];

  // Try Linear Regression
  try {
    const linear = trainLinearRegression(
      XTrain, yTrain, XTest, yTest,
      data.featureNames, data.targetName, datasetId
    );
    results.push(linear);
  } catch (e) {
    console.error("Linear regression failed:", e);
  }

  // Try Polynomial Regression (degree 2)
  try {
    const poly = trainPolynomialRegression(
      XTrain, yTrain, XTest, yTest, 2,
      data.featureNames, data.targetName, datasetId
    );
    results.push(poly);
  } catch (e) {
    console.error("Polynomial regression failed:", e);
  }

  // Try Random Forest
  try {
    const rf = trainRandomForest(
      XTrain, yTrain, XTest, yTest,
      data.featureNames, data.targetName, datasetId
    );
    results.push(rf);
  } catch (e) {
    console.error("Random forest failed:", e);
  }

  return results.sort((a, b) => a.model.metrics.rmse - b.model.metrics.rmse);
}

// Export model to JSON
export async function exportModel(model: TrainedModel, outputPath: string): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(model, null, 2));
}

// Import model from JSON
export async function importModel(inputPath: string): Promise<TrainedModel> {
  const content = await fs.readFile(inputPath, "utf-8");
  return JSON.parse(content) as TrainedModel;
}

// Predict with trained model
export function predict(model: TrainedModel, X: number[][]): number[] {
  switch (model.type) {
    case "linear": {
      const { slope, intercept } = model.model;
      return X.map(row => slope * row[0] + intercept);
    }
    case "polynomial": {
      const { coefficients } = model.model;
      return X.map(row => {
        const x = row[0];
        return coefficients.reduce((sum: number, coef: number, i: number) => 
          sum + coef * Math.pow(x, i), 0
        );
      });
    }
    case "random_forest": {
      throw new Error("Random Forest prediction requires re-training. Model cannot be serialized.");
    }
    default:
      throw new Error(`Unknown model type: ${model.type}`);
  }
}


// Classification Types
export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_labels: (string | number)[];
}

export interface ClassificationModel {
  id: string;
  name: string;
  type: "logistic_regression" | "random_forest_classifier";
  metrics: ClassificationMetrics;
  model: any;
  featureNames: string[];
  targetName: string;
  trainedAt: string;
  datasetId: string;
  version: number;
  parent_id?: string;
  description?: string;
}

export interface ClassificationResult {
  model: ClassificationModel;
  predictions: (string | number)[];
  actual: (string | number)[];
  confusion_matrix: number[][];
  class_labels: (string | number)[];
}

/**
 * Calculate confusion matrix
 */
export function calculateConfusionMatrix(
  actual: (string | number)[],
  predicted: (string | number)[]
): { matrix: number[][], labels: (string | number)[] } {
  // Get unique labels
  const labels = Array.from(new Set([...actual, ...predicted])).sort();
  const labelToIndex = new Map(labels.map((label, i) => [label, i]));
  
  // Initialize matrix
  const matrix = Array(labels.length).fill(0).map(() => Array(labels.length).fill(0));
  
  // Fill matrix
  for (let i = 0; i < actual.length; i++) {
    const actualIdx = labelToIndex.get(actual[i])!;
    const predIdx = labelToIndex.get(predicted[i])!;
    matrix[actualIdx][predIdx]++;
  }
  
  return { matrix, labels };
}

/**
 * Calculate classification metrics
 */
export function calculateClassificationMetrics(
  actual: (string | number)[],
  predicted: (string | number)[]
): ClassificationMetrics {
  const { matrix, labels } = calculateConfusionMatrix(actual, predicted);
  
  // Calculate accuracy
  const correct = matrix.reduce((sum, row, i) => sum + row[i], 0);
  const total = actual.length;
  const accuracy = correct / total;
  
  // Calculate per-class metrics
  const numClasses = labels.length;
  let totalPrecision = 0;
  let totalRecall = 0;
  let validClasses = 0;
  
  for (let i = 0; i < numClasses; i++) {
    // True positives
    const tp = matrix[i][i];
    
    // False positives (predicted as class i but actually other classes)
    const fp = matrix.reduce((sum, row, j) => j !== i ? sum + row[i] : sum, 0);
    
    // False negatives (actually class i but predicted as other classes)
    const fn = matrix[i].reduce((sum, val, j) => j !== i ? sum + val : sum, 0);
    
    // Precision = TP / (TP + FP)
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    
    // Recall = TP / (TP + FN)
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    
    if (!isNaN(precision) && !isNaN(recall)) {
      totalPrecision += precision;
      totalRecall += recall;
      validClasses++;
    }
  }
  
  // Macro-averaged metrics
  const precision = validClasses > 0 ? totalPrecision / validClasses : 0;
  const recall = validClasses > 0 ? totalRecall / validClasses : 0;
  
  // F1 Score = 2 * (precision * recall) / (precision + recall)
  const f1_score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1_score,
    confusion_matrix: matrix,
    class_labels: labels,
  };
}

/**
 * Train Logistic Regression (simple implementation)
 */
export async function trainLogisticRegression(
  X: number[][],
  y: (string | number)[],
  featureNames: string[],
  targetName: string,
  datasetId: string,
  name: string = "Logistic Regression Model"
): Promise<ClassificationResult> {
  // Convert labels to numeric
  const uniqueLabels = Array.from(new Set(y)).sort();
  const labelToNum = new Map(uniqueLabels.map((label, i) => [label, i]));
  const numToLabel = new Map(uniqueLabels.map((label, i) => [i, label]));
  
  const yNumeric = y.map(label => labelToNum.get(label)!);
  
  // Simple logistic regression using gradient descent
  const numFeatures = X[0].length;
  let weights = Array(numFeatures).fill(0);
  let bias = 0;
  
  const learningRate = 0.01;
  const iterations = 1000;
  
  // Sigmoid function
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  
  // Training
  for (let iter = 0; iter < iterations; iter++) {
    const predictions = X.map(row => {
      const z = row.reduce((sum, val, i) => sum + val * weights[i], bias);
      return sigmoid(z);
    });
    
    // Update weights
    for (let i = 0; i < numFeatures; i++) {
      const gradient = X.reduce((sum, row, j) => {
        return sum + (predictions[j] - yNumeric[j]) * row[i];
      }, 0) / X.length;
      weights[i] -= learningRate * gradient;
    }
    
    // Update bias
    const biasGradient = predictions.reduce((sum, pred, i) => sum + (pred - yNumeric[i]), 0) / X.length;
    bias -= learningRate * biasGradient;
  }
  
  // Make predictions
  const predictedNumeric = X.map(row => {
    const z = row.reduce((sum, val, i) => sum + val * weights[i], bias);
    const prob = sigmoid(z);
    return prob >= 0.5 ? 1 : 0;
  });
  
  const predicted = predictedNumeric.map(num => numToLabel.get(num)!);
  
  // Calculate metrics
  const metrics = calculateClassificationMetrics(y, predicted);
  
  const model: ClassificationModel = {
    id: `model_${Date.now()}`,
    name,
    type: "logistic_regression",
    metrics,
    model: { weights, bias, labelToNum: Array.from(labelToNum.entries()), numToLabel: Array.from(numToLabel.entries()) },
    featureNames,
    targetName,
    trainedAt: new Date().toISOString(),
    datasetId,
    version: 1,
  };
  
  return {
    model,
    predictions: predicted,
    actual: y,
    confusion_matrix: metrics.confusion_matrix,
    class_labels: metrics.class_labels,
  };
}

/**
 * Train Random Forest Classifier
 */
export async function trainRandomForestClassifier(
  X: number[][],
  y: (string | number)[],
  featureNames: string[],
  targetName: string,
  datasetId: string,
  name: string = "Random Forest Classifier",
  options: { nEstimators?: number; maxDepth?: number } = {}
): Promise<ClassificationResult> {
  const { nEstimators = 100, maxDepth = 10 } = options;
  
  // Convert labels to numeric
  const uniqueLabels = Array.from(new Set(y)).sort();
  const labelToNum = new Map(uniqueLabels.map((label, i) => [label, i]));
  const numToLabel = new Map(uniqueLabels.map((label, i) => [i, label]));
  
  const yNumeric = y.map(label => labelToNum.get(label)!);
  
  // Train Random Forest
  const rf = new RandomForestClassifier({
    nEstimators,
    maxDepth,
    seed: 42,
  });
  
  rf.train(X, yNumeric);
  
  // Make predictions
  const predictedNumeric = rf.predict(X);
  const predicted = predictedNumeric.map(num => numToLabel.get(num)!);
  
  // Calculate metrics
  const metrics = calculateClassificationMetrics(y, predicted);
  
  const model: ClassificationModel = {
    id: `model_${Date.now()}`,
    name,
    type: "random_forest_classifier",
    metrics,
    model: { rf: rf.toJSON(), labelToNum: Array.from(labelToNum.entries()), numToLabel: Array.from(numToLabel.entries()) },
    featureNames,
    targetName,
    trainedAt: new Date().toISOString(),
    datasetId,
    version: 1,
  };
  
  return {
    model,
    predictions: predicted,
    actual: y,
    confusion_matrix: metrics.confusion_matrix,
    class_labels: metrics.class_labels,
  };
}
