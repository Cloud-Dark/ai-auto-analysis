import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload as UploadIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Upload() {
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const uploadMutation = trpc.dataset.upload.useMutation({
    onSuccess: (dataset) => {
      toast.success("Dataset uploaded successfully!");
      setLocation(`/config/${dataset.id}`);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const content = base64.split(',')[1]; // Remove data:*/*;base64, prefix

        await uploadMutation.mutateAsync({
          filename: file.name,
          content,
          mimeType: file.type || 'text/csv',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AI Auto Analysis
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Upload your dataset to start automated analysis with AI
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6" />
              Upload Dataset
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file to begin analysis. Maximum file size: 50MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-all
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }
                ${uploading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Uploading dataset...
                  </p>
                </div>
              ) : (
                <>
                  <UploadIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    or
                  </p>
                  <label htmlFor="file-input">
                    <Button variant="default" size="lg" asChild>
                      <span className="cursor-pointer">
                        Browse Files
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Supported formats: CSV, XLSX, XLS
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => setLocation("/datasets")}
          >
            View My Datasets
          </Button>
        </div>
      </div>
    </div>
  );
}
