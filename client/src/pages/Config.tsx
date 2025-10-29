import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Sparkles } from "lucide-react";
import { createSession, getDataset } from "@/lib/api";
import { toast } from "sonner";

export default function Config() {
  const [, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-2.0-flash-exp");
  const [loading, setLoading] = useState(false);
  const [datasetName, setDatasetName] = useState("");

  useEffect(() => {
    const datasetId = localStorage.getItem("current_dataset_id");
    if (!datasetId) {
      toast.error("No dataset found. Please upload a dataset first.");
      setLocation("/upload");
      return;
    }

    getDataset(datasetId).then(dataset => {
      setDatasetName(dataset.name);
    }).catch(() => {
      toast.error("Failed to load dataset");
      setLocation("/upload");
    });

    const savedApiKey = localStorage.getItem("gemini_api_key");
    const savedModel = localStorage.getItem("gemini_model");
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setModelName(savedModel);
  }, [setLocation]);

  const handleContinue = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Gemini API key");
      return;
    }

    if (!modelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    const datasetId = localStorage.getItem("current_dataset_id");
    if (!datasetId) {
      toast.error("No dataset found");
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem("gemini_api_key", apiKey);
      localStorage.setItem("gemini_model", modelName);

      const session = await createSession({
        dataset_id: datasetId,
        gemini_api_key: apiKey,
        model_name: modelName,
        title: `Analysis of ${datasetName}`,
      });

      localStorage.setItem("current_session_id", session.id);
      toast.success("Configuration saved!");
      setLocation("/chat");
    } catch (error: any) {
      toast.error(error.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Configure AI Model</h1>
          <p className="text-gray-600">Set up your Gemini API credentials</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Gemini AI Configuration
            </CardTitle>
            <CardDescription>
              Configure your Google Gemini API to power the analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {datasetName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Dataset loaded:</span> {datasetName}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Gemini API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                type="text"
                placeholder="e.g., gemini-2.0-flash-exp"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                list="model-suggestions"
              />
              <datalist id="model-suggestions">
                <option value="gemini-2.5-flash-lite" />
                <option value="gemini-2.5-flash" />
                <option value="gemini-2.0-flash-exp" />
                <option value="gemini-1.5-flash" />
                <option value="gemini-1.5-pro" />
                <option value="gemini-1.0-pro" />
              </datalist>
              <p className="text-xs text-gray-500">
                Choose a model or enter a custom model name
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Model Recommendations:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>gemini-2.5-flash-lite</strong> - Fastest, most efficient</li>
                <li>• <strong>gemini-2.0-flash-exp</strong> - Balanced (recommended)</li>
                <li>• <strong>gemini-1.5-pro</strong> - Most capable, slower</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setLocation("/upload")}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={loading || !apiKey || !modelName}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue to Chat"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
