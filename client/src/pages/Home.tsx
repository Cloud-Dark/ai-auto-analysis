import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, BarChart3, TrendingUp, Upload as UploadIcon } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function Home() {
  const navigate = (path: string) => window.location.href = path;
  const [, setLocation] = useLocation();

  // Removed auto-redirect

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      <div className="min-h-screen bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-white mb-4">
              {APP_TITLE}
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Automated AI-Powered Data Analysis
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-12">
              Upload your dataset, configure AI, and get instant insights with exploratory data analysis and forecasting powered by Google Gemini
            </p>
            
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6"
              onClick={() => setLocation("/upload")}
            >
              Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <UploadIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Upload Dataset</h3>
              <p className="text-white/80">
                Simply drag and drop your CSV or Excel file to get started. Supports files up to 50MB.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Configuration</h3>
              <p className="text-white/80">
                Configure your Gemini API key and let AI understand your data structure automatically.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Instant Analysis</h3>
              <p className="text-white/80">
                Chat with AI to perform EDA, generate visualizations, and create forecasts in real-time.
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 text-center">Powerful Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-1">Exploratory Data Analysis</h4>
                  <p className="text-white/80 text-sm">
                    Comprehensive statistical summaries, correlation matrices, distribution plots, and missing value analysis
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-1">Time Series Forecasting</h4>
                  <p className="text-white/80 text-sm">
                    Predict future trends using Prophet and ARIMA models with automatic parameter tuning
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-1">Natural Language Interface</h4>
                  <p className="text-white/80 text-sm">
                    Ask questions in plain English and get AI-powered insights with streaming responses
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <UploadIcon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-1">No-Code Model Building</h4>
                  <p className="text-white/80 text-sm">
                    Train machine learning models without writing code. Get RMSE, MSE, MAE metrics instantly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
