import { Tool } from "@google/generative-ai";
import Papa from "papaparse";
import fs from "fs/promises";
import { mean, standardDeviation, median, mode, quantile } from "simple-statistics";
import * as XLSX from "xlsx";

// Enhanced EDA with more visualizations
export const enhancedEdaTool: Tool = {
  name: "enhanced_eda",
  description: "Perform comprehensive Exploratory Data Analysis with correlation heatmap, distribution plots, and outlier detection",
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the dataset file",
      },
    },
    required: ["file_path"],
  },
  execute: async (args: any) => {
    try {
      const { file_path } = args;
      const fileContent = await fs.readFile(file_path, "utf-8");
      
      let data: any[];
      if (file_path.endsWith(".csv")) {
        const parsed = Papa.parse(fileContent, { header: true, dynamicTyping: true });
        data = parsed.data;
      } else {
        const workbook = XLSX.read(fileContent, { type: "string" });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      // Filter out empty rows
      data = data.filter(row => Object.values(row).some(val => val != null));

      if (data.length === 0) {
        return { error: "No data found in file" };
      }

      const columns = Object.keys(data[0]);
      const numericColumns = columns.filter(col => {
        return data.some(row => typeof row[col] === "number");
      });

      // Basic statistics
      const statistics: Record<string, any> = {};
      for (const col of numericColumns) {
        const values = data
          .map(row => row[col])
          .filter(val => typeof val === "number") as number[];

        if (values.length > 0) {
          statistics[col] = {
            count: values.length,
            mean: mean(values),
            std: standardDeviation(values),
            min: Math.min(...values),
            q25: quantile(values, 0.25),
            median: median(values),
            q75: quantile(values, 0.75),
            max: Math.max(...values),
            missing: data.length - values.length,
          };
        }
      }

      // Correlation matrix
      const correlationMatrix: Record<string, Record<string, number>> = {};
      for (const col1 of numericColumns) {
        correlationMatrix[col1] = {};
        const values1 = data
          .map(row => row[col1])
          .filter(val => typeof val === "number") as number[];

        for (const col2 of numericColumns) {
          const values2 = data
            .map(row => row[col2])
            .filter(val => typeof val === "number") as number[];

          // Pearson correlation
          const n = Math.min(values1.length, values2.length);
          if (n > 0) {
            const mean1 = mean(values1);
            const mean2 = mean(values2);
            const std1 = standardDeviation(values1);
            const std2 = standardDeviation(values2);

            let sum = 0;
            for (let i = 0; i < n; i++) {
              sum += ((values1[i] - mean1) / std1) * ((values2[i] - mean2) / std2);
            }
            correlationMatrix[col1][col2] = sum / n;
          }
        }
      }

      // Outlier detection (IQR method)
      const outliers: Record<string, number[]> = {};
      for (const col of numericColumns) {
        const values = data
          .map(row => row[col])
          .filter(val => typeof val === "number") as number[];

        if (values.length > 0) {
          const q1 = quantile(values, 0.25);
          const q3 = quantile(values, 0.75);
          const iqr = q3 - q1;
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          outliers[col] = values.filter(v => v < lowerBound || v > upperBound);
        }
      }

      // Distribution info
      const distributions: Record<string, any> = {};
      for (const col of numericColumns) {
        const values = data
          .map(row => row[col])
          .filter(val => typeof val === "number") as number[];

        if (values.length > 0) {
          // Create histogram bins
          const min = Math.min(...values);
          const max = Math.max(...values);
          const binCount = 10;
          const binSize = (max - min) / binCount;
          const bins: number[] = new Array(binCount).fill(0);

          for (const val of values) {
            const binIndex = Math.min(Math.floor((val - min) / binSize), binCount - 1);
            bins[binIndex]++;
          }

          distributions[col] = {
            bins,
            binSize,
            min,
            max,
          };
        }
      }

      return {
        summary: {
          total_rows: data.length,
          total_columns: columns.length,
          numeric_columns: numericColumns.length,
          categorical_columns: columns.length - numericColumns.length,
        },
        statistics,
        correlation_matrix: correlationMatrix,
        outliers: Object.fromEntries(
          Object.entries(outliers).map(([k, v]) => [k, v.length])
        ),
        distributions,
        columns,
        sample_data: data.slice(0, 5),
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// Time series decomposition
export const timeSeriesDecompositionTool: Tool = {
  name: "time_series_decomposition",
  description: "Decompose time series data into trend, seasonal, and residual components",
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the dataset file",
      },
      date_column: {
        type: "string",
        description: "Name of the date/time column",
      },
      value_column: {
        type: "string",
        description: "Name of the value column to decompose",
      },
      period: {
        type: "number",
        description: "Seasonal period (e.g., 12 for monthly data with yearly seasonality)",
      },
    },
    required: ["file_path", "date_column", "value_column"],
  },
  execute: async (args: any) => {
    try {
      const { file_path, date_column, value_column, period = 12 } = args;
      const fileContent = await fs.readFile(file_path, "utf-8");
      const parsed = Papa.parse(fileContent, { header: true, dynamicTyping: true });
      const data = parsed.data.filter((row: any) => row[value_column] != null);

      // Sort by date
      data.sort((a: any, b: any) => {
        const dateA = new Date(a[date_column]).getTime();
        const dateB = new Date(b[date_column]).getTime();
        return dateA - dateB;
      });

      const values = data.map((row: any) => row[value_column]);

      // Simple moving average for trend
      const trend: number[] = [];
      const windowSize = period;
      for (let i = 0; i < values.length; i++) {
        if (i < windowSize / 2 || i >= values.length - windowSize / 2) {
          trend.push(values[i]);
        } else {
          const start = Math.floor(i - windowSize / 2);
          const end = Math.ceil(i + windowSize / 2);
          const window = values.slice(start, end);
          trend.push(mean(window));
        }
      }

      // Detrended series
      const detrended = values.map((v: number, i: number) => v - trend[i]);

      // Seasonal component (average for each period)
      const seasonal: number[] = [];
      const seasonalAverages: number[] = new Array(period).fill(0);
      const seasonalCounts: number[] = new Array(period).fill(0);

      for (let i = 0; i < detrended.length; i++) {
        const seasonIndex = i % period;
        seasonalAverages[seasonIndex] += detrended[i];
        seasonalCounts[seasonIndex]++;
      }

      for (let i = 0; i < period; i++) {
        if (seasonalCounts[i] > 0) {
          seasonalAverages[i] /= seasonalCounts[i];
        }
      }

      for (let i = 0; i < values.length; i++) {
        seasonal.push(seasonalAverages[i % period]);
      }

      // Residual
      const residual = values.map((v: number, i: number) => v - trend[i] - seasonal[i]);

      return {
        dates: data.map((row: any) => row[date_column]),
        original: values,
        trend,
        seasonal,
        residual,
        period,
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

export const enhancedTools: Tool[] = [enhancedEdaTool, timeSeriesDecompositionTool];
