import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Config() {
  const params = useParams();
  const datasetId = parseInt(params.id as string);
  const [, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-2.0-flash-exp");
  const [isCreating, setIsCreating] = useState(false);

  const availableModels = [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental) - Fast & Latest" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash - Fast & Efficient" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro - Most Capable" },
    { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro - Stable" },
  ];

  const { data: dataset, isLoading } = trpc.dataset.get.useQuery({ id: datasetId });

  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: (session) => {
      toast.success("Session created! Starting analysis...");
      setLocation(`/chat/${session.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      toast.error("Please enter your Gemini API key");
      return;
    }

    setIsCreating(true);
    await createSessionMutation.mutateAsync({
      datasetId,
      geminiApiKey: apiKey,
      modelName,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Dataset Not Found</CardTitle>
            <CardDescription>The requested dataset could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Configure AI Provider
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Enter your Gemini API key to enable AI analysis
          </p>
        </div>

        <Card className="shadow-xl mb-6">
          <CardHeader>
            <CardTitle>Dataset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{dataset.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">File:</span>
                <span className="text-sm text-gray-900 dark:text-white">{dataset.originalFilename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Size:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {dataset.fileSize ? `${(dataset.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              Gemini API Configuration
            </CardTitle>
            <CardDescription>
              Your API key is stored securely and only used for this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">Gemini API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isCreating}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Don't have an API key?{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Get one from Google AI Studio
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <select
                  id="model"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose the model based on your needs. Flash models are faster, Pro models are more capable.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                  What you can do:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Perform comprehensive Exploratory Data Analysis (EDA)</li>
                  <li>• Generate statistical summaries and visualizations</li>
                  <li>• Create time series forecasts</li>
                  <li>• Ask questions about your data in natural language</li>
                  <li>• Get AI-powered insights and recommendations</li>
                </ul>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isCreating || !apiKey.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    Start Analysis
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            disabled={isCreating}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
