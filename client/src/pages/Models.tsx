import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Trash2, TrendingUp, Calendar, Target } from "lucide-react";
import * as api from "@/lib/api";

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
  datasetId: string;
}

export default function Models() {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await api.get("/ml/models");
      if (response.success) {
        setModels(response.data);
      }
    } catch (error) {
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
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

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;

    try {
      const response = await api.del(`/ml/models/${modelId}`);
      if (response.success) {
        toast.success("Model deleted successfully");
        loadModels();
      }
    } catch (error) {
      toast.error("Failed to delete model");
    }
  };

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case "linear":
        return "bg-blue-500";
      case "polynomial":
        return "bg-purple-500";
      case "random_forest":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading models...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Models</h1>
            <p className="text-muted-foreground">
              Manage your trained machine learning models
            </p>
          </div>
          <Button onClick={() => window.location.href = "/build-model"}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Train New Model
          </Button>
        </div>

        {models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No models yet</h3>
              <p className="text-muted-foreground mb-4">
                Train your first AI model to get started
              </p>
              <Button onClick={() => window.location.href = "/build-model"}>
                Train New Model
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getModelTypeColor(model.type)}`} />
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {model.type.replace("_", " ")}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {new Date(model.trainedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target */}
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-medium">{model.targetName}</span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">RMSE</p>
                      <p className="text-lg font-bold">{model.metrics.rmse.toFixed(3)}</p>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">R²</p>
                      <p className="text-lg font-bold">{model.metrics.r2.toFixed(3)}</p>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">MAE</p>
                      <p className="text-lg font-bold">{model.metrics.mae.toFixed(3)}</p>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">MSE</p>
                      <p className="text-lg font-bold">{model.metrics.mse.toFixed(3)}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Features:</p>
                    <p className="text-sm">{model.featureNames.join(", ")}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExport(model.id, model.name)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(model.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
