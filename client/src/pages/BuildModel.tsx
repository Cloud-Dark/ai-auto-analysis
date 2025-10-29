import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Download, Upload, TrendingUp, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import * as api from "@/lib/api";

interface Dataset {
  id: string;
  name: string;
  file_path: string;
  uploaded_at: string;
}

interface TrainedModel {
  id: string;
  name: string;
  type: string;
  metrics: {
    rmse: number;
    mse: number;
    mae: number;
    r2: number;
    mape?: number;
  };
  featureNames: string[];
  targetName: string;
  trainedAt: string;
}

interface TrainingResult {
  model: TrainedModel;
  predictions: number[];
  actual: number[];
  residuals: number[];
  featureImportance?: Record<string, number>;
}

export default function BuildModel() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [modelType, setModelType] = useState<string>("auto");
  const [modelName, setModelName] = useState<string>("");
  const [testSize, setTestSize] = useState<number>(0.2);
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [multipleResults, setMultipleResults] = useState<TrainingResult[]>([]);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const response = await api.get("/datasets");
      if (response.success) {
        setDatasets(response.data);
      }
    } catch (error) {
      toast.error("Failed to load datasets");
    }
  };

  const handleTrain = async () => {
    if (!selectedDataset || !targetColumn) {
      toast.error("Please select dataset and target column");
      return;
    }

    setTraining(true);
    setResult(null);
    setMultipleResults([]);

    try {
      const response = await api.post("/ml/train", {
        dataset_id: selectedDataset,
        target_column: targetColumn,
        model_type: modelType,
        test_size: testSize,
        options: {
          name: modelName || undefined,
          degree: 2, // for polynomial
          n_estimators: 100, // for random forest
          max_depth: 10,
        },
      });

      if (response.success) {
        if (modelType === "auto" && response.data.models) {
          // Multiple models from auto-train
          setMultipleResults(response.data.models.map((m: any) => ({
            model: m.model,
            predictions: [],
            actual: [],
            residuals: [],
            featureImportance: m.featureImportance,
          })));
          toast.success(`Trained ${response.data.models.length} models! Best: ${response.data.best_model.name}`);
        } else {
          // Single model
          setResult(response.data);
          toast.success(`Model trained successfully! RMSE: ${response.data.model.metrics.rmse.toFixed(4)}`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Training failed");
    } finally {
      setTraining(false);
    }
  };

  const handleExport = async (modelId: string, modelName: string) => {
    try {
      const response = await fetch(`/api/ml/models/${modelId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${modelName}.json`;
      a.click();
      toast.success("Model exported successfully!");
    } catch (error) {
      toast.error("Failed to export model");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const model = JSON.parse(text);

      const response = await api.post("/ml/models/import", model);
      if (response.success) {
        toast.success("Model imported successfully!");
      }
    } catch (error) {
      toast.error("Failed to import model");
    }
  };

  const renderMetrics = (metrics: TrainedModel["metrics"]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">RMSE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.rmse.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">Root Mean Squared Error</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">MSE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.mse.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">Mean Squared Error</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">MAE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.mae.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">Mean Absolute Error</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">R²</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.r2.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">Coefficient of Determination</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderPredictionChart = (predictions: number[], actual: number[]) => {
    const data = predictions.map((pred, i) => ({
      index: i,
      predicted: pred,
      actual: actual[i],
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="actual" stroke="#8884d8" name="Actual" />
          <Line type="monotone" dataKey="predicted" stroke="#82ca9d" name="Predicted" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderResidualPlot = (residuals: number[]) => {
    const data = residuals.map((res, i) => ({
      index: i,
      residual: res,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" name="Index" />
          <YAxis dataKey="residual" name="Residual" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Residuals" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Build AI Model Without Coding</h1>
          <p className="text-muted-foreground">
            Train machine learning models with just a few clicks. No coding required!
          </p>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
            <CardDescription>Select your dataset and configure training parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Column (What to predict)</Label>
                <Input
                  placeholder="e.g., price, sales, temperature"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model Type</Label>
                <Select value={modelType} onValueChange={setModelType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Compare All Models)</SelectItem>
                    <SelectItem value="linear">Linear Regression</SelectItem>
                    <SelectItem value="polynomial">Polynomial Regression</SelectItem>
                    <SelectItem value="random_forest">Random Forest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model Name (Optional)</Label>
                <Input
                  placeholder="My Sales Predictor"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Test Size ({(testSize * 100).toFixed(0)}%)</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleTrain} disabled={training} className="flex-1">
                {training ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Train Model
                  </>
                )}
              </Button>

              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Model
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results for Auto Mode */}
        {multipleResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Model Comparison</h2>
            {multipleResults.map((res, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{res.model.name}</CardTitle>
                      <CardDescription>
                        Type: {res.model.type} | Trained: {new Date(res.model.trainedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(res.model.id, res.model.name)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMetrics(res.model.metrics)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results for Single Model */}
        {result && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Training Results</h2>
              <Button
                variant="outline"
                onClick={() => handleExport(result.model.id, result.model.name)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Model
              </Button>
            </div>

            {/* Metrics */}
            {renderMetrics(result.model.metrics)}

            {/* Predictions vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>Predictions vs Actual Values</CardTitle>
                <CardDescription>How well the model predicts the target variable</CardDescription>
              </CardHeader>
              <CardContent>
                {renderPredictionChart(result.predictions, result.actual)}
              </CardContent>
            </Card>

            {/* Residuals */}
            <Card>
              <CardHeader>
                <CardTitle>Residual Plot</CardTitle>
                <CardDescription>Difference between actual and predicted values</CardDescription>
              </CardHeader>
              <CardContent>
                {renderResidualPlot(result.residuals)}
              </CardContent>
            </Card>

            {/* Feature Importance */}
            {result.featureImportance && (
              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance</CardTitle>
                  <CardDescription>Which features matter most for predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(result.featureImportance).map(([feature, importance]) => (
                      <div key={feature} className="flex items-center gap-2">
                        <span className="w-32 text-sm">{feature}</span>
                        <div className="flex-1 bg-secondary h-6 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ width: `${importance * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Model Info */}
            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Model ID</p>
                    <p className="font-mono text-sm">{result.model.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{result.model.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="font-medium">{result.model.targetName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Features</p>
                    <p className="font-medium">{result.model.featureNames.join(", ")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
