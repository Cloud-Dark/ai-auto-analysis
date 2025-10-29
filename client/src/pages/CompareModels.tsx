import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Award } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Model {
  id: string;
  name: string;
  type: string;
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
    mape?: number;
  };
  trainedAt: string;
  version: number;
}

interface ComparisonRow {
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

interface ComparisonResult {
  best_overall: string;
  comparison_table: ComparisonRow[];
  recommendations: string[];
}

export default function CompareModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ml/models");
      const result = await response.json();
      if (result.success) {
        setModels(result.data);
      }
    } catch (error) {
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  };

  const compareModels = async () => {
    if (selectedModels.size < 2) {
      toast.error("Please select at least 2 models to compare");
      return;
    }

    setComparing(true);
    try {
      const response = await fetch("/api/ml/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_ids: Array.from(selectedModels) }),
      });

      const result = await response.json();
      if (result.success) {
        setComparison(result.data);
        toast.success("Models compared successfully");
      } else {
        toast.error(result.error || "Failed to compare models");
      }
    } catch (error) {
      toast.error("Error comparing models");
    } finally {
      setComparing(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">🥇 1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400">🥈 2nd</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600">🥉 3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Compare Models</h1>
        <p className="text-muted-foreground">
          Select multiple models to compare their performance metrics
        </p>
      </div>

      {/* Model Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Models ({selectedModels.size} selected)</CardTitle>
          <CardDescription>Choose at least 2 models to compare</CardDescription>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No models available. Train some models first!
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedModels.has(model.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleModel(model.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedModels.has(model.id)}
                      onCheckedChange={() => toggleModel(model.id)}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{model.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {model.type.replace("_", " ")} • v{model.version}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">R²:</span>
                          <span className="font-medium">{model.metrics.r2.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RMSE:</span>
                          <span className="font-medium">{model.metrics.rmse.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={compareModels}
              disabled={selectedModels.size < 2 || comparing}
            >
              {comparing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Compare Selected Models
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Best Model */}
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Best Overall Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bestModel = comparison.comparison_table.find(
                  (m) => m.id === comparison.best_overall
                );
                return bestModel ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{bestModel.name}</h3>
                      <p className="text-muted-foreground capitalize">
                        {bestModel.type.replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{bestModel.r2.toFixed(4)}</div>
                      <div className="text-sm text-muted-foreground">R² Score</div>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detailed Comparison</CardTitle>
              <CardDescription>Performance metrics and rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">RMSE</th>
                      <th className="text-right p-2">MAE</th>
                      <th className="text-right p-2">R²</th>
                      <th className="text-center p-2">Overall Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.comparison_table.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-b ${
                          row.id === comparison.best_overall ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2 capitalize text-sm text-muted-foreground">
                          {row.type.replace("_", " ")}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {row.rmse.toFixed(4)}
                            {getRankBadge(row.rank_rmse)}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {row.mae.toFixed(4)}
                            {getRankBadge(row.rank_mae)}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {row.r2.toFixed(4)}
                            {getRankBadge(row.rank_r2)}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {getRankBadge(row.rank_overall)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>AI-generated insights and suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparison.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {rec.includes("✅") || rec.includes("🎯") ? (
                      <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : rec.includes("❌") || rec.includes("⚠️") ? (
                      <TrendingDown className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p className="text-sm">{rec.replace(/[✅❌⚠️🎯📊📈📏🌲✓]/g, "").trim()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
