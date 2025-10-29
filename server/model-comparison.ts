import { TrainedModel, ModelMetrics } from "./ml-models";

/**
 * Model Comparison Utilities
 * Compare multiple models and rank them by performance
 */

export interface ComparisonResult {
  models: TrainedModel[];
  rankings: {
    by_rmse: string[]; // Model IDs sorted by RMSE (lower is better)
    by_mae: string[]; // Model IDs sorted by MAE (lower is better)
    by_r2: string[]; // Model IDs sorted by R² (higher is better)
    by_mape: string[]; // Model IDs sorted by MAPE (lower is better)
  };
  best_overall: string; // Model ID with best overall performance
  comparison_table: ComparisonRow[];
  recommendations: string[];
}

export interface ComparisonRow {
  id: string;
  name: string;
  type: string;
  rmse: number;
  mae: number;
  r2: number;
  mape?: number;
  rank_rmse: number;
  rank_mae: number;
  rank_r2: number;
  rank_overall: number;
}

/**
 * Compare multiple models and return detailed comparison
 */
export function compareModels(models: TrainedModel[]): ComparisonResult {
  if (models.length === 0) {
    throw new Error("No models to compare");
  }

  // Sort by each metric
  const by_rmse = [...models].sort((a, b) => a.metrics.rmse - b.metrics.rmse).map(m => m.id);
  const by_mae = [...models].sort((a, b) => a.metrics.mae - b.metrics.mae).map(m => m.id);
  const by_r2 = [...models].sort((a, b) => b.metrics.r2 - a.metrics.r2).map(m => m.id); // Higher is better
  const by_mape = [...models]
    .filter(m => m.metrics.mape != null)
    .sort((a, b) => (a.metrics.mape || 0) - (b.metrics.mape || 0))
    .map(m => m.id);

  // Calculate ranks for each model
  const comparison_table: ComparisonRow[] = models.map(model => {
    const rank_rmse = by_rmse.indexOf(model.id) + 1;
    const rank_mae = by_mae.indexOf(model.id) + 1;
    const rank_r2 = by_r2.indexOf(model.id) + 1;
    
    // Overall rank is average of individual ranks (lower is better)
    const rank_overall = Math.round((rank_rmse + rank_mae + rank_r2) / 3);

    return {
      id: model.id,
      name: model.name,
      type: model.type,
      rmse: model.metrics.rmse,
      mae: model.metrics.mae,
      r2: model.metrics.r2,
      mape: model.metrics.mape,
      rank_rmse,
      rank_mae,
      rank_r2,
      rank_overall,
    };
  });

  // Sort by overall rank
  comparison_table.sort((a, b) => a.rank_overall - b.rank_overall);

  // Best overall model (lowest average rank)
  const best_overall = comparison_table[0].id;
  const best_model = models.find(m => m.id === best_overall)!;

  // Generate recommendations
  const recommendations = generateRecommendations(models, comparison_table, best_model);

  return {
    models,
    rankings: {
      by_rmse,
      by_mae,
      by_r2,
      by_mape,
    },
    best_overall,
    comparison_table,
    recommendations,
  };
}

/**
 * Generate recommendations based on comparison results
 */
function generateRecommendations(
  models: TrainedModel[],
  comparison_table: ComparisonRow[],
  best_model: TrainedModel
): string[] {
  const recommendations: string[] = [];

  // Best overall recommendation
  recommendations.push(
    `✅ **Best Overall Model**: ${best_model.name} (${best_model.type}) with R² = ${best_model.metrics.r2.toFixed(4)}`
  );

  // Check if R² is good
  if (best_model.metrics.r2 > 0.9) {
    recommendations.push("🎯 **Excellent fit**: R² > 0.9 indicates very strong predictive power");
  } else if (best_model.metrics.r2 > 0.7) {
    recommendations.push("✓ **Good fit**: R² > 0.7 indicates reasonable predictive power");
  } else if (best_model.metrics.r2 > 0.5) {
    recommendations.push("⚠️ **Moderate fit**: R² > 0.5 suggests moderate predictive power. Consider feature engineering.");
  } else {
    recommendations.push("❌ **Poor fit**: R² < 0.5 indicates weak predictive power. Try different features or models.");
  }

  // Check error metrics
  const best_rmse = Math.min(...models.map(m => m.metrics.rmse));
  const worst_rmse = Math.max(...models.map(m => m.metrics.rmse));
  const rmse_improvement = ((worst_rmse - best_rmse) / worst_rmse * 100).toFixed(1);
  
  if (parseFloat(rmse_improvement) > 10) {
    recommendations.push(
      `📊 **Significant improvement**: Best model has ${rmse_improvement}% lower RMSE than worst model`
    );
  }

  // Model type recommendations
  const model_types = models.map(m => m.type);
  if (model_types.includes("polynomial") && best_model.type === "polynomial") {
    recommendations.push("📈 **Non-linear relationship detected**: Polynomial regression performs best");
  } else if (model_types.includes("random_forest") && best_model.type === "random_forest") {
    recommendations.push("🌲 **Complex patterns detected**: Random Forest captures non-linear relationships well");
  } else if (best_model.type === "linear") {
    recommendations.push("📏 **Linear relationship**: Simple linear regression is sufficient for this data");
  }

  // MAPE recommendations
  if (best_model.metrics.mape != null) {
    if (best_model.metrics.mape < 10) {
      recommendations.push("🎯 **High accuracy**: MAPE < 10% indicates excellent predictions");
    } else if (best_model.metrics.mape < 20) {
      recommendations.push("✓ **Good accuracy**: MAPE < 20% indicates good predictions");
    } else {
      recommendations.push("⚠️ **Moderate accuracy**: MAPE > 20% suggests room for improvement");
    }
  }

  // Overfitting check (if we have multiple models of same type)
  const same_type_models = models.filter(m => m.type === best_model.type);
  if (same_type_models.length > 1) {
    const r2_variance = standardDeviation(same_type_models.map(m => m.metrics.r2));
    if (r2_variance > 0.1) {
      recommendations.push("⚠️ **High variance detected**: Consider cross-validation to check for overfitting");
    }
  }

  return recommendations;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Get model version history
 */
export function getModelVersionHistory(models: TrainedModel[], modelId: string): TrainedModel[] {
  const versions: TrainedModel[] = [];
  const modelMap = new Map(models.map(m => [m.id, m]));
  
  let current = modelMap.get(modelId);
  
  // Traverse backwards through parent_id chain
  while (current) {
    versions.unshift(current); // Add to beginning
    if (current.parent_id) {
      current = modelMap.get(current.parent_id);
    } else {
      break;
    }
  }
  
  return versions;
}

/**
 * Create new version of a model
 */
export function createModelVersion(
  parentModel: TrainedModel,
  newModel: Partial<TrainedModel>
): TrainedModel {
  const version = parentModel.version + 1;
  
  return {
    ...parentModel,
    ...newModel,
    id: newModel.id || `${parentModel.id}_v${version}`,
    version,
    parent_id: parentModel.id,
    trainedAt: new Date().toISOString(),
  } as TrainedModel;
}

/**
 * Compare two specific models
 */
export function compareTwoModels(model1: TrainedModel, model2: TrainedModel): {
  winner: string;
  metrics_comparison: Record<string, { model1: number; model2: number; winner: string }>;
  improvement_percentage: Record<string, number>;
  summary: string;
} {
  const metrics_comparison: Record<string, { model1: number; model2: number; winner: string }> = {};
  const improvement_percentage: Record<string, number> = {};

  // Compare RMSE (lower is better)
  metrics_comparison.rmse = {
    model1: model1.metrics.rmse,
    model2: model2.metrics.rmse,
    winner: model1.metrics.rmse < model2.metrics.rmse ? model1.id : model2.id,
  };
  improvement_percentage.rmse = ((Math.abs(model1.metrics.rmse - model2.metrics.rmse) / Math.max(model1.metrics.rmse, model2.metrics.rmse)) * 100);

  // Compare MAE (lower is better)
  metrics_comparison.mae = {
    model1: model1.metrics.mae,
    model2: model2.metrics.mae,
    winner: model1.metrics.mae < model2.metrics.mae ? model1.id : model2.id,
  };
  improvement_percentage.mae = ((Math.abs(model1.metrics.mae - model2.metrics.mae) / Math.max(model1.metrics.mae, model2.metrics.mae)) * 100);

  // Compare R² (higher is better)
  metrics_comparison.r2 = {
    model1: model1.metrics.r2,
    model2: model2.metrics.r2,
    winner: model1.metrics.r2 > model2.metrics.r2 ? model1.id : model2.id,
  };
  improvement_percentage.r2 = ((Math.abs(model1.metrics.r2 - model2.metrics.r2) / Math.max(Math.abs(model1.metrics.r2), Math.abs(model2.metrics.r2))) * 100);

  // Determine overall winner (majority vote)
  const wins = {
    [model1.id]: 0,
    [model2.id]: 0,
  };
  
  Object.values(metrics_comparison).forEach(comp => {
    wins[comp.winner]++;
  });

  const winner = wins[model1.id] > wins[model2.id] ? model1.id : model2.id;
  const winner_model = winner === model1.id ? model1 : model2;

  const summary = `${winner_model.name} (${winner_model.type}) wins with ${wins[winner]}/3 metrics. ` +
    `Average improvement: ${((improvement_percentage.rmse + improvement_percentage.mae + improvement_percentage.r2) / 3).toFixed(1)}%`;

  return {
    winner,
    metrics_comparison,
    improvement_percentage,
    summary,
  };
}
