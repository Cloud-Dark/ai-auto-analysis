import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import {
  loadDataFromCSV,
  trainTestSplit,
  trainLinearRegression,
  trainPolynomialRegression,
  trainRandomForest,
  autoTrain,
  exportModel,
  importModel,
  predict,
  trainLogisticRegression,
  trainRandomForestClassifier,
  type TrainedModel,
  type TrainingResult,
  type ClassificationModel,
  type ClassificationResult,
} from "./ml-models";
import { getDataset } from "./json-db";

const router = Router();

const MODELS_DIR = path.join(process.cwd(), "data", "models");

// Ensure models directory exists
fs.mkdir(MODELS_DIR, { recursive: true }).catch(console.error);

// Auto-detect problem type
router.post("/detect", async (req, res) => {
  try {
    const { dataset_id, target_column } = req.body;

    if (!dataset_id || !target_column) {
      return res.status(400).json({
        success: false,
        error: "dataset_id and target_column are required",
      });
    }

    const dataset = getDataset(dataset_id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
      });
    }

    const { detectProblemType, getRecommendedModels, getMetricNames } = await import("./auto-detect");
    const detection = await detectProblemType(dataset.file_path, target_column);
    const recommendedModels = getRecommendedModels(detection.problemType);
    const metricNames = getMetricNames(detection.problemType);

    res.json({
      success: true,
      data: {
        ...detection,
        recommendedModels,
        metricNames,
      },
    });
  } catch (error: any) {
    console.error("Error detecting problem type:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Train model
router.post("/train", async (req, res) => {
  try {
    const {
      dataset_id,
      target_column,
      model_type,
      test_size = 0.2,
      options = {},
    } = req.body;

    if (!dataset_id || !target_column) {
      return res.status(400).json({
        success: false,
        error: "dataset_id and target_column are required",
      });
    }

    const dataset = getDataset(dataset_id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
      });
    }

    const data = await loadDataFromCSV(dataset.file_path, target_column);
    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(
      data.X,
      data.y,
      test_size
    );

    let result: TrainingResult;

    switch (model_type) {
      case "linear":
        result = trainLinearRegression(
          XTrain,
          yTrain,
          XTest,
          yTest,
          data.featureNames,
          data.targetName,
          dataset_id,
          options.name
        );
        break;

      case "polynomial":
        result = trainPolynomialRegression(
          XTrain,
          yTrain,
          XTest,
          yTest,
          options.degree || 2,
          data.featureNames,
          data.targetName,
          dataset_id,
          options.name
        );
        break;

      case "random_forest":
        result = trainRandomForest(
          XTrain,
          yTrain,
          XTest,
          yTest,
          data.featureNames,
          data.targetName,
          dataset_id,
          {
            nEstimators: options.n_estimators || 100,
            maxDepth: options.max_depth || 10,
          },
          options.name
        );
        break;

      case "logistic_regression":
        const logisticResult = await trainLogisticRegression(
          XTrain as any,
          yTrain as any,
          data.featureNames,
          data.targetName,
          dataset_id,
          options.name
        );
        // Save classification model
        const logisticPath = path.join(MODELS_DIR, `${logisticResult.model.id}.json`);
        await fs.writeFile(logisticPath, JSON.stringify(logisticResult.model, null, 2));
        return res.json({
          success: true,
          data: logisticResult,
        });

      case "random_forest_classifier":
        const rfClassResult = await trainRandomForestClassifier(
          XTrain,
          yTrain as any,
          data.featureNames,
          data.targetName,
          dataset_id,
          options.name,
          {
            nEstimators: options.n_estimators || 100,
            maxDepth: options.max_depth || 10,
          }
        );
        // Save classification model
        const rfClassPath = path.join(MODELS_DIR, `${rfClassResult.model.id}.json`);
        await fs.writeFile(rfClassPath, JSON.stringify(rfClassResult.model, null, 2));
        return res.json({
          success: true,
          data: rfClassResult,
        });

      case "auto":
        const results = await autoTrain(dataset.file_path, target_column, dataset_id, test_size);
        return res.json({
          success: true,
          data: {
            models: results.map(r => ({
              model: r.model,
              metrics: r.model.metrics,
              featureImportance: r.featureImportance,
            })),
            best_model: results[0]?.model,
          },
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown model type: ${model_type}`,
        });
    }

    // Save model
    const modelPath = path.join(MODELS_DIR, `${result.model.id}.json`);
    await exportModel(result.model, modelPath);

    res.json({
      success: true,
      data: {
        model: result.model,
        predictions: result.predictions,
        actual: result.actual,
        residuals: result.residuals,
        featureImportance: result.featureImportance,
        model_path: modelPath,
      },
    });
  } catch (error: any) {
    console.error("Training error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Training failed",
    });
  }
});

// List all trained models
router.get("/models", async (req, res) => {
  try {
    const files = await fs.readdir(MODELS_DIR);
    const modelFiles = files.filter(f => f.endsWith(".json"));

    const models: TrainedModel[] = [];
    for (const file of modelFiles) {
      try {
        const model = await importModel(path.join(MODELS_DIR, file));
        models.push(model);
      } catch (e) {
        console.error(`Failed to load model ${file}:`, e);
      }
    }

    models.sort((a, b) => 
      new Date(b.trainedAt).getTime() - new Date(a.trainedAt).getTime()
    );

    res.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list models",
    });
  }
});

// Get model by ID
router.get("/models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const modelPath = path.join(MODELS_DIR, `${id}.json`);

    const model = await importModel(modelPath);

    res.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: "Model not found",
    });
  }
});

// Delete model
router.delete("/models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const modelPath = path.join(MODELS_DIR, `${id}.json`);

    await fs.unlink(modelPath);

    res.json({
      success: true,
      message: "Model deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete model",
    });
  }
});

// Export model (download)
router.get("/models/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    const modelPath = path.join(MODELS_DIR, `${id}.json`);

    const model = await importModel(modelPath);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${model.name}.json"`);
    res.send(JSON.stringify(model, null, 2));
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: "Model not found",
    });
  }
});

// Import model (upload)
router.post("/models/import", async (req, res) => {
  try {
    const model = req.body as TrainedModel;

    if (!model.id || !model.type || !model.model) {
      return res.status(400).json({
        success: false,
        error: "Invalid model format",
      });
    }

    // Generate new ID to avoid conflicts
    model.id = `model-${Date.now()}`;

    const modelPath = path.join(MODELS_DIR, `${model.id}.json`);
    await exportModel(model, modelPath);

    res.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to import model",
    });
  }
});

// Predict with model
router.post("/models/:id/predict", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: inputData } = req.body;

    if (!inputData || !Array.isArray(inputData)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input data. Expected array of arrays.",
      });
    }

    const modelPath = path.join(MODELS_DIR, `${id}.json`);
    const model = await importModel(modelPath);

    const predictions = predict(model, inputData);

    res.json({
      success: true,
      data: {
        predictions,
        model_name: model.name,
        features: model.featureNames,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Prediction failed",
    });
  }
});

export default router;

// Compare multiple models
router.post("/compare", async (req, res) => {
  try {
    const { model_ids } = req.body;

    if (!model_ids || !Array.isArray(model_ids) || model_ids.length < 2) {
      return res.status(400).json({
        success: false,
        error: "At least 2 model IDs are required for comparison",
      });
    }

    // Load all models
    const models: TrainedModel[] = [];
    for (const id of model_ids) {
      const modelPath = path.join(MODELS_DIR, `${id}.json`);
      try {
        const modelData = await fs.readFile(modelPath, "utf-8");
        models.push(JSON.parse(modelData));
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: `Model not found: ${id}`,
        });
      }
    }

    // Import comparison utilities
    const { compareModels } = await import("./model-comparison");
    const comparison = compareModels(models);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error("Error comparing models:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Compare two models
router.post("/compare-two", async (req, res) => {
  try {
    const { model1_id, model2_id } = req.body;

    if (!model1_id || !model2_id) {
      return res.status(400).json({
        success: false,
        error: "Both model1_id and model2_id are required",
      });
    }

    // Load both models
    const model1Path = path.join(MODELS_DIR, `${model1_id}.json`);
    const model2Path = path.join(MODELS_DIR, `${model2_id}.json`);

    const [model1Data, model2Data] = await Promise.all([
      fs.readFile(model1Path, "utf-8"),
      fs.readFile(model2Path, "utf-8"),
    ]);

    const model1 = JSON.parse(model1Data);
    const model2 = JSON.parse(model2Data);

    // Import comparison utilities
    const { compareTwoModels } = await import("./model-comparison");
    const comparison = compareTwoModels(model1, model2);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error("Error comparing two models:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get model version history
router.get("/versions/:model_id", async (req, res) => {
  try {
    const { model_id } = req.params;

    // Load all models
    const files = await fs.readdir(MODELS_DIR);
    const models: TrainedModel[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const modelData = await fs.readFile(path.join(MODELS_DIR, file), "utf-8");
        models.push(JSON.parse(modelData));
      }
    }

    // Import versioning utilities
    const { getModelVersionHistory } = await import("./model-comparison");
    const versions = getModelVersionHistory(models, model_id);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error: any) {
    console.error("Error getting model versions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new version of a model
router.post("/versions/:model_id", async (req, res) => {
  try {
    const { model_id } = req.params;
    const { description, ...newModelData } = req.body;

    // Load parent model
    const parentPath = path.join(MODELS_DIR, `${model_id}.json`);
    const parentData = await fs.readFile(parentPath, "utf-8");
    const parentModel = JSON.parse(parentData);

    // Import versioning utilities
    const { createModelVersion } = await import("./model-comparison");
    const newVersion = createModelVersion(parentModel, {
      ...newModelData,
      description,
    });

    // Save new version
    const newVersionPath = path.join(MODELS_DIR, `${newVersion.id}.json`);
    await fs.writeFile(newVersionPath, JSON.stringify(newVersion, null, 2));

    res.json({
      success: true,
      data: newVersion,
    });
  } catch (error: any) {
    console.error("Error creating model version:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
