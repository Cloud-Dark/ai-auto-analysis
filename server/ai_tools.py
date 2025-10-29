#!/usr/bin/env python3
"""
AI Analysis Tools using LangChain and Gemini
Provides EDA and forecasting capabilities for datasets
"""

import sys
import json
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')

# Global dataset storage
current_dataset: pd.DataFrame = None
dataset_path: str = None

def load_dataset(file_path: str) -> Dict[str, Any]:
    """Load dataset from file path"""
    global current_dataset, dataset_path
    try:
        if file_path.endswith('.csv'):
            current_dataset = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            current_dataset = pd.read_excel(file_path)
        else:
            return {"error": "Unsupported file format. Please use CSV or Excel files."}
        
        dataset_path = file_path
        
        return {
            "success": True,
            "shape": current_dataset.shape,
            "columns": list(current_dataset.columns),
            "dtypes": {col: str(dtype) for col, dtype in current_dataset.dtypes.items()},
            "head": current_dataset.head().to_dict()
        }
    except Exception as e:
        return {"error": str(e)}

@tool
def perform_eda(analysis_type: str = "comprehensive") -> str:
    """
    Perform Exploratory Data Analysis on the loaded dataset.
    
    Args:
        analysis_type: Type of analysis - 'comprehensive', 'statistical', 'correlation', or 'distribution'
    
    Returns:
        JSON string with analysis results and visualizations
    """
    global current_dataset
    
    if current_dataset is None:
        return json.dumps({"error": "No dataset loaded. Please load a dataset first."})
    
    try:
        results = {
            "analysis_type": analysis_type,
            "dataset_info": {
                "shape": current_dataset.shape,
                "columns": list(current_dataset.columns),
                "dtypes": {col: str(dtype) for col, dtype in current_dataset.dtypes.items()}
            }
        }
        
        # Basic statistics
        results["statistics"] = current_dataset.describe().to_dict()
        
        # Missing values
        missing = current_dataset.isnull().sum()
        results["missing_values"] = {col: int(val) for col, val in missing.items() if val > 0}
        
        # Correlation matrix for numeric columns
        numeric_cols = current_dataset.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 1:
            corr_matrix = current_dataset[numeric_cols].corr()
            results["correlation"] = corr_matrix.to_dict()
            
            # Generate correlation heatmap
            plt.figure(figsize=(10, 8))
            sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, fmt='.2f')
            plt.title('Correlation Heatmap')
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            results["visualizations"] = results.get("visualizations", [])
            results["visualizations"].append({
                "type": "heatmap",
                "title": "Correlation Heatmap",
                "image": f"data:image/png;base64,{img_base64}"
            })
        
        # Distribution plots for numeric columns
        if analysis_type in ["comprehensive", "distribution"]:
            for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
                plt.figure(figsize=(10, 6))
                plt.subplot(1, 2, 1)
                current_dataset[col].hist(bins=30, edgecolor='black')
                plt.title(f'Distribution of {col}')
                plt.xlabel(col)
                plt.ylabel('Frequency')
                
                plt.subplot(1, 2, 2)
                current_dataset.boxplot(column=col)
                plt.title(f'Box Plot of {col}')
                
                plt.tight_layout()
                
                buf = io.BytesIO()
                plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
                buf.seek(0)
                img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
                results["visualizations"] = results.get("visualizations", [])
                results["visualizations"].append({
                    "type": "distribution",
                    "column": col,
                    "title": f"Distribution Analysis: {col}",
                    "image": f"data:image/png;base64,{img_base64}"
                })
        
        return json.dumps(results, indent=2)
        
    except Exception as e:
        return json.dumps({"error": f"EDA failed: {str(e)}"})

@tool
def forecast_data(target_column: str, periods: int = 30, method: str = "auto") -> str:
    """
    Perform time series forecasting on the specified column.
    
    Args:
        target_column: Name of the column to forecast
        periods: Number of periods to forecast (default: 30)
        method: Forecasting method - 'auto', 'prophet', or 'arima'
    
    Returns:
        JSON string with forecast results and visualization
    """
    global current_dataset
    
    if current_dataset is None:
        return json.dumps({"error": "No dataset loaded. Please load a dataset first."})
    
    if target_column not in current_dataset.columns:
        return json.dumps({"error": f"Column '{target_column}' not found in dataset."})
    
    try:
        # Prepare data
        data = current_dataset[[target_column]].copy()
        data = data.dropna()
        
        if len(data) < 10:
            return json.dumps({"error": "Not enough data points for forecasting. Need at least 10 data points."})
        
        # Add time index if not present
        data['ds'] = pd.date_range(start='2020-01-01', periods=len(data), freq='D')
        data['y'] = data[target_column]
        
        results = {
            "target_column": target_column,
            "method": method,
            "periods": periods,
            "data_points": len(data)
        }
        
        # Choose forecasting method
        if method == "auto" or method == "prophet":
            # Prophet forecasting
            model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
            model.fit(data[['ds', 'y']])
            
            future = model.make_future_dataframe(periods=periods)
            forecast = model.predict(future)
            
            results["forecast_values"] = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(periods).to_dict('records')
            results["method_used"] = "Prophet"
            
            # Generate forecast plot
            fig = model.plot(forecast)
            plt.title(f'Forecast for {target_column} using Prophet')
            plt.xlabel('Date')
            plt.ylabel(target_column)
            plt.tight_layout()
            
        else:  # ARIMA
            # Simple ARIMA model
            model = ARIMA(data['y'], order=(1, 1, 1))
            fitted_model = model.fit()
            
            forecast_result = fitted_model.forecast(steps=periods)
            
            results["forecast_values"] = [
                {"index": i, "value": float(val)} 
                for i, val in enumerate(forecast_result, 1)
            ]
            results["method_used"] = "ARIMA"
            
            # Generate forecast plot
            plt.figure(figsize=(12, 6))
            plt.plot(data['y'].values, label='Historical Data')
            forecast_index = range(len(data), len(data) + periods)
            plt.plot(forecast_index, forecast_result, label='Forecast', color='red')
            plt.title(f'Forecast for {target_column} using ARIMA')
            plt.xlabel('Time Index')
            plt.ylabel(target_column)
            plt.legend()
            plt.tight_layout()
        
        # Save plot
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        results["visualization"] = {
            "type": "forecast",
            "title": f"Forecast: {target_column}",
            "image": f"data:image/png;base64,{img_base64}"
        }
        
        return json.dumps(results, indent=2)
        
    except Exception as e:
        return json.dumps({"error": f"Forecasting failed: {str(e)}"})

@tool
def get_column_info() -> str:
    """
    Get information about all columns in the dataset.
    
    Returns:
        JSON string with column names, types, and sample values
    """
    global current_dataset
    
    if current_dataset is None:
        return json.dumps({"error": "No dataset loaded."})
    
    try:
        column_info = {}
        for col in current_dataset.columns:
            column_info[col] = {
                "dtype": str(current_dataset[col].dtype),
                "non_null_count": int(current_dataset[col].count()),
                "null_count": int(current_dataset[col].isnull().sum()),
                "unique_values": int(current_dataset[col].nunique()),
                "sample_values": current_dataset[col].head(3).tolist()
            }
        
        return json.dumps({
            "columns": column_info,
            "total_rows": len(current_dataset),
            "total_columns": len(current_dataset.columns)
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})

def create_agent(api_key: str):
    """Create LangChain agent with tools"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        google_api_key=api_key,
        temperature=0.3
    )
    
    tools = [perform_eda, forecast_data, get_column_info]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert data analyst assistant. You have access to tools for:
1. Exploratory Data Analysis (EDA) - analyze data distributions, correlations, and statistics
2. Forecasting - predict future values using time series models
3. Column Information - get detailed information about dataset columns

When a user asks to analyze data:
- Use perform_eda tool for exploratory analysis, statistical summaries, correlations, and visualizations
- Use forecast_data tool for time series predictions
- Use get_column_info tool to understand the dataset structure

Always provide clear, detailed explanations of your findings. When tools return visualizations, describe what they show.
Be proactive in suggesting relevant analyses based on the data characteristics."""),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
    
    return agent_executor

def stream_chat(api_key: str, message: str, dataset_file: str = None, chat_history: List[Dict[str, str]] = None):
    """Stream chat responses"""
    if chat_history is None:
        chat_history = []
    
    # Load dataset if provided
    if dataset_file and dataset_file != "":
        load_result = load_dataset(dataset_file)
        if "error" in load_result:
            yield json.dumps({"type": "error", "message": load_result["error"]}) + "\n"
            return
    
    agent = create_agent(api_key)
    
    # Convert chat history to LangChain format
    formatted_history = []
    for msg in chat_history:
        if msg["role"] == "user":
            formatted_history.append(("human", msg["content"]))
        elif msg["role"] == "assistant":
            formatted_history.append(("ai", msg["content"]))
    
    try:
        # Stream the response
        for chunk in agent.stream({
            "input": message,
            "chat_history": formatted_history
        }):
            # Yield different types of chunks
            if "output" in chunk:
                yield json.dumps({"type": "content", "data": chunk["output"]}) + "\n"
            elif "intermediate_steps" in chunk:
                for step in chunk["intermediate_steps"]:
                    tool_name = step[0].tool
                    tool_input = step[0].tool_input
                    tool_output = step[1]
                    
                    yield json.dumps({
                        "type": "tool_call",
                        "tool": tool_name,
                        "input": tool_input,
                        "output": tool_output
                    }) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"

if __name__ == "__main__":
    # Command line interface for testing
    if len(sys.argv) < 2:
        print("Usage: python ai_tools.py <command> [args...]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "load":
        if len(sys.argv) < 3:
            print("Usage: python ai_tools.py load <file_path>")
            sys.exit(1)
        result = load_dataset(sys.argv[2])
        print(json.dumps(result, indent=2))
    
    elif command == "chat":
        if len(sys.argv) < 4:
            print("Usage: python ai_tools.py chat <api_key> <message> [dataset_path]")
            sys.exit(1)
        api_key = sys.argv[2]
        message = sys.argv[3]
        dataset_file = sys.argv[4] if len(sys.argv) > 4 else None
        
        for chunk in stream_chat(api_key, message, dataset_file):
            print(chunk, end='', flush=True)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
