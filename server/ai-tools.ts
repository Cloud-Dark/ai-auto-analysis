import { GoogleGenerativeAI } from "@google/generative-ai";
import * as stats from "simple-statistics";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import fs from "fs/promises";

interface DatasetInfo {
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, string>;
  head: any[];
}

interface EDAResult {
  analysis_type: string;
  dataset_info: DatasetInfo;
  statistics: Record<string, any>;
  missing_values: Record<string, number>;
  correlation?: Record<string, any>;
  visualizations?: Array<{
    type: string;
    title: string;
    data: any;
  }>;
}

interface ForecastResult {
  target_column: string;
  method: string;
  periods: number;
  data_points: number;
  forecast_values: any[];
  visualization?: {
    type: string;
    title: string;
    data: any;
  };
}

// Global dataset storage
let currentDataset: Record<string, any[]> | null = null;
let datasetColumns: string[] = [];

/**
 * Detect column data type
 */
function detectType(values: any[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== "");
  if (nonNullValues.length === 0) return "string";
  
  const sample = nonNullValues[0];
  if (typeof sample === "number") return "number";
  if (typeof sample === "boolean") return "boolean";
  if (!isNaN(Number(sample))) return "number";
  return "string";
}

/**
 * Load dataset from file path
 */
export async function loadDataset(filePath: string): Promise<{ success: boolean; error?: string; info?: DatasetInfo }> {
  try {
    const fileContent = await fs.readFile(filePath);
    let data: any[] = [];
    
    // Check file extension
    if (filePath.endsWith(".csv")) {
      // Parse CSV
      const parsed = Papa.parse(fileContent.toString("utf-8"), {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        return { success: false, error: `CSV parsing error: ${parsed.errors[0].message}` };
      }

      data = parsed.data;
    } else if (filePath.endsWith(".xlsx") || filePath.endsWith(".xls")) {
      // Parse Excel
      const workbook = XLSX.read(fileContent, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return { success: false, error: "Unsupported file format" };
    }

    if (data.length === 0) {
      return { success: false, error: "No data found in file" };
    }

    // Convert to column-based storage
    const columns = Object.keys(data[0]);
    const dataset: Record<string, any[]> = {};
    
    columns.forEach(col => {
      dataset[col] = data.map(row => row[col]);
    });

    currentDataset = dataset;
    datasetColumns = columns;

    // Get data types
    const dtypes: Record<string, string> = {};
    columns.forEach(col => {
      dtypes[col] = detectType(dataset[col]);
    });

    return {
      success: true,
      info: {
        shape: [data.length, columns.length],
        columns,
        dtypes,
        head: data.slice(0, 5),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get numeric columns
 */
function getNumericColumns(): string[] {
  if (!currentDataset) return [];
  
  return datasetColumns.filter(col => {
    const values = currentDataset![col].filter(v => v !== null && v !== undefined && v !== "");
    return values.length > 0 && !isNaN(Number(values[0]));
  });
}

/**
 * Calculate correlation between two arrays
 */
function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = stats.mean(x);
  const meanY = stats.mean(y);
  const stdX = stats.standardDeviation(x);
  const stdY = stats.standardDeviation(y);
  
  if (stdX === 0 || stdY === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += ((x[i] - meanX) / stdX) * ((y[i] - meanY) / stdY);
  }
  
  return sum / (x.length - 1);
}

/**
 * Perform Exploratory Data Analysis
 */
export async function performEDA(analysisType: string = "comprehensive"): Promise<EDAResult | { error: string }> {
  if (!currentDataset) {
    return { error: "No dataset loaded. Please load a dataset first." };
  }

  try {
    const rowCount = currentDataset[datasetColumns[0]].length;
    const dtypes: Record<string, string> = {};
    
    datasetColumns.forEach(col => {
      dtypes[col] = detectType(currentDataset![col]);
    });

    // Get first 5 rows
    const head: any[] = [];
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      const row: any = {};
      datasetColumns.forEach(col => {
        row[col] = currentDataset![col][i];
      });
      head.push(row);
    }

    const result: EDAResult = {
      analysis_type: analysisType,
      dataset_info: {
        shape: [rowCount, datasetColumns.length],
        columns: datasetColumns,
        dtypes,
        head,
      },
      statistics: {},
      missing_values: {},
      visualizations: [],
    };

    // Get statistics for numeric columns
    const numericColumns = getNumericColumns();

    numericColumns.forEach((col) => {
      const values = currentDataset![col]
        .filter(v => v !== null && v !== undefined && v !== "")
        .map(v => Number(v));
      
      if (values.length > 0) {
        result.statistics[col] = {
          count: values.length,
          mean: stats.mean(values),
          std: stats.standardDeviation(values),
          min: stats.min(values),
          max: stats.max(values),
          median: stats.median(values),
          q1: stats.quantile(values, 0.25),
          q3: stats.quantile(values, 0.75),
        };
      }
    });

    // Missing values
    datasetColumns.forEach((col) => {
      const nullCount = currentDataset![col].filter(v => v === null || v === undefined || v === "").length;
      if (nullCount > 0) {
        result.missing_values[col] = nullCount;
      }
    });

    // Correlation matrix for numeric columns
    if (numericColumns.length > 1) {
      const correlationData: Record<string, any> = {};
      
      numericColumns.forEach((col1) => {
        correlationData[col1] = {};
        const values1 = currentDataset![col1]
          .filter(v => v !== null && v !== undefined && v !== "")
          .map(v => Number(v));
        
        numericColumns.forEach((col2) => {
          if (col1 === col2) {
            correlationData[col1][col2] = 1.0;
          } else {
            const values2 = currentDataset![col2]
              .filter(v => v !== null && v !== undefined && v !== "")
              .map(v => Number(v));
            
            correlationData[col1][col2] = correlation(values1, values2);
          }
        });
      });
      
      result.correlation = correlationData;

      // Create heatmap data
      result.visualizations?.push({
        type: "heatmap",
        title: "Correlation Heatmap",
        data: {
          z: numericColumns.map(col1 => 
            numericColumns.map(col2 => correlationData[col1][col2])
          ),
          x: numericColumns,
          y: numericColumns,
          type: "heatmap",
          colorscale: "RdBu",
          zmid: 0,
        },
      });
    }

    // Distribution data for numeric columns (first 5)
    if (analysisType === "comprehensive" || analysisType === "distribution") {
      numericColumns.slice(0, 5).forEach((col) => {
        const values = currentDataset![col]
          .filter(v => v !== null && v !== undefined && v !== "")
          .map(v => Number(v));
        
        // Create histogram data
        result.visualizations?.push({
          type: "histogram",
          title: `Distribution of ${col}`,
          data: {
            x: values,
            type: "histogram",
            name: col,
            nbinsx: 30,
          },
        });

        // Create box plot data
        result.visualizations?.push({
          type: "box",
          title: `Box Plot of ${col}`,
          data: {
            y: values,
            type: "box",
            name: col,
          },
        });
      });
    }

    return result;
  } catch (error: any) {
    return { error: `EDA failed: ${error.message}` };
  }
}

/**
 * Exponential smoothing forecast
 */
function exponentialSmoothing(data: number[], periods: number, alpha: number = 0.3): number[] {
  const forecast: number[] = [];
  let lastValue = data[data.length - 1];
  let lastSmoothed = data[data.length - 1];
  
  for (let i = 0; i < periods; i++) {
    const smoothed = alpha * lastValue + (1 - alpha) * lastSmoothed;
    forecast.push(smoothed);
    lastValue = smoothed;
    lastSmoothed = smoothed;
  }
  
  return forecast;
}

/**
 * Perform time series forecasting
 */
export async function forecastData(
  targetColumn: string,
  periods: number = 30,
  method: string = "auto"
): Promise<ForecastResult | { error: string }> {
  if (!currentDataset) {
    return { error: "No dataset loaded. Please load a dataset first." };
  }

  if (!datasetColumns.includes(targetColumn)) {
    return { error: `Column '${targetColumn}' not found in dataset.` };
  }

  try {
    const values = currentDataset[targetColumn]
      .filter(v => v !== null && v !== undefined && v !== "")
      .map(v => Number(v));

    if (values.length < 10) {
      return { error: "Not enough data points for forecasting. Need at least 10 data points." };
    }

    // Use exponential smoothing as default method
    const forecastValues = exponentialSmoothing(values, periods);

    const result: ForecastResult = {
      target_column: targetColumn,
      method: "Exponential Smoothing",
      periods,
      data_points: values.length,
      forecast_values: forecastValues.map((val, idx) => ({
        index: idx + 1,
        value: val,
      })),
      visualization: {
        type: "forecast",
        title: `Forecast: ${targetColumn}`,
        data: {
          historical: {
            x: Array.from({ length: values.length }, (_, i) => i),
            y: values,
            type: "scatter",
            mode: "lines",
            name: "Historical Data",
          },
          forecast: {
            x: Array.from({ length: periods }, (_, i) => values.length + i),
            y: forecastValues,
            type: "scatter",
            mode: "lines",
            name: "Forecast",
            line: { dash: "dash", color: "red" },
          },
        },
      },
    };

    return result;
  } catch (error: any) {
    return { error: `Forecasting failed: ${error.message}` };
  }
}

/**
 * Get column information
 */
export async function getColumnInfo(): Promise<{ columns: Record<string, any>; total_rows: number; total_columns: number } | { error: string }> {
  if (!currentDataset) {
    return { error: "No dataset loaded." };
  }

  try {
    const columnInfo: Record<string, any> = {};
    const rowCount = currentDataset[datasetColumns[0]].length;

    datasetColumns.forEach((col) => {
      const values = currentDataset![col];
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== "");
      
      columnInfo[col] = {
        dtype: detectType(values),
        non_null_count: nonNullValues.length,
        null_count: values.length - nonNullValues.length,
        unique_values: new Set(values).size,
        sample_values: values.slice(0, 3),
      };
    });

    return {
      columns: columnInfo,
      total_rows: rowCount,
      total_columns: datasetColumns.length,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * AI Agent with function calling
 */
export async function createAIAgent(apiKey: string, modelName: string = "gemini-2.0-flash-exp") {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const tools = [
    {
      name: "perform_eda",
      description: "Perform Exploratory Data Analysis on the loaded dataset. Returns statistical summaries, correlation matrices, and visualizations.",
      parameters: {
        type: "object",
        properties: {
          analysis_type: {
            type: "string",
            enum: ["comprehensive", "statistical", "correlation", "distribution"],
            description: "Type of analysis to perform",
          },
        },
      },
    },
    {
      name: "forecast_data",
      description: "Perform time series forecasting on a specific column. Returns forecast values and visualization.",
      parameters: {
        type: "object",
        properties: {
          target_column: {
            type: "string",
            description: "Name of the column to forecast",
          },
          periods: {
            type: "number",
            description: "Number of periods to forecast (default: 30)",
          },
          method: {
            type: "string",
            enum: ["auto", "exponential", "moving_average"],
            description: "Forecasting method to use",
          },
        },
        required: ["target_column"],
      },
    },
    {
      name: "get_column_info",
      description: "Get detailed information about all columns in the dataset, including data types, null counts, and sample values.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ];

  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: tools as any }],
  });

  return { model, tools };
}

/**
 * Execute function call
 */
export async function executeFunctionCall(functionName: string, args: any): Promise<any> {
  switch (functionName) {
    case "perform_eda":
      return await performEDA(args.analysis_type || "comprehensive");
    case "forecast_data":
      return await forecastData(args.target_column, args.periods || 30, args.method || "auto");
    case "get_column_info":
      return await getColumnInfo();
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}
