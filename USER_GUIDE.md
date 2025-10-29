# AI Auto Analysis - User Guide

Complete guide for using the AI Auto Analysis platform to build machine learning models without coding.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Upload Dataset](#upload-dataset)
3. [Configure AI](#configure-ai)
4. [Chat with AI](#chat-with-ai)
5. [Build Models (No-Code)](#build-models-no-code)
6. [Manage Models](#manage-models)
7. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

AI Auto Analysis is a no-code platform for data analysis and machine learning. You can:
- Upload datasets (CSV, Excel)
- Perform exploratory data analysis (EDA)
- Train machine learning models without coding
- Export and reuse trained models
- Get AI-powered insights with Google Gemini

### Requirements

- **Gemini API Key**: Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Dataset**: CSV or Excel file (up to 50MB)
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

---

## Upload Dataset

### Step 1: Navigate to Upload Page

Click "Get Started" or go to `/upload` page.

### Step 2: Upload Your File

**Supported Formats:**
- CSV (`.csv`)
- Excel (`.xlsx`, `.xls`)

**File Size Limit:** 50MB

**Methods:**
1. **Drag & Drop**: Drag your file into the upload area
2. **Click to Browse**: Click the upload area to select a file

### Step 3: Verify Upload

After upload, you'll see:
- File name
- File size
- Upload timestamp
- Dataset ID

**Example Dataset Structure:**
```csv
date,sales,temperature,promotion
2024-01-01,100,25,0
2024-01-02,120,26,1
2024-01-03,110,24,0
```

---

## Configure AI

### Step 1: Go to Config Page

Navigate to `/config` page.

### Step 2: Enter API Key

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Paste it in the "Gemini API Key" field
3. **Important**: Keep your API key secure!

### Step 3: Choose Model

**Available Models:**
- `gemini-2.0-flash-exp` - Latest experimental model
- `gemini-2.0-flash-lite` - Fast and lightweight
- `gemini-1.5-flash` - Balanced performance
- `gemini-1.5-pro` - Most capable
- Custom model name (manual input)

**Recommendations:**
- **For speed**: Use `gemini-2.0-flash-lite`
- **For accuracy**: Use `gemini-1.5-pro`
- **For balance**: Use `gemini-1.5-flash`

### Step 4: Save Configuration

Click "Save Configuration" to proceed.

---

## Chat with AI

### Starting a Chat Session

1. Upload dataset
2. Configure AI (API key + model)
3. Go to `/chat` page
4. Select your dataset
5. Start chatting!

### What You Can Ask

**Exploratory Data Analysis (EDA):**
```
"Please perform EDA on my data"
"Show me statistics for all columns"
"What are the correlations between variables?"
"Detect outliers in my dataset"
"Show distribution of sales column"
```

**Time Series Analysis:**
```
"Decompose my time series data"
"Show trend and seasonality"
"Forecast sales for next 30 days"
```

**Data Insights:**
```
"What patterns do you see in the data?"
"Which features are most important?"
"Are there any missing values?"
"Summarize my dataset"
```

### Understanding AI Responses

The AI will provide:
- **Text explanations** - Insights and interpretations
- **Statistics** - Mean, median, std dev, quartiles
- **Visualizations** - Charts and plots (when applicable)
- **Recommendations** - Next steps for analysis

---

## Build Models (No-Code)

Train machine learning models without writing any code!

### Step 1: Navigate to Build Model Page

Go to `/build-model` page.

### Step 2: Select Dataset

Choose the dataset you want to use for training.

### Step 3: Configure Model

**Required Fields:**
- **Target Column**: The variable you want to predict (e.g., "sales", "price")
- **Model Type**: Choose from:
  - **Auto** - Compare all models and pick the best
  - **Linear Regression** - For linear relationships
  - **Polynomial Regression** - For non-linear patterns
  - **Random Forest** - For complex relationships

**Optional Fields:**
- **Model Name**: Give your model a descriptive name
- **Test Size**: Percentage of data for testing (default: 20%)

### Step 4: Train Model

Click "Train Model" and wait for training to complete.

**Training Time:**
- Linear/Polynomial: 1-5 seconds
- Random Forest: 5-15 seconds
- Auto (all models): 15-30 seconds

### Step 5: Review Results

After training, you'll see:

**1. Metrics:**
- **RMSE** (Root Mean Squared Error) - Lower is better
- **MSE** (Mean Squared Error) - Lower is better
- **MAE** (Mean Absolute Error) - Lower is better
- **R²** (Coefficient of Determination) - Higher is better (0-1)
- **MAPE** (Mean Absolute Percentage Error) - Lower is better

**2. Visualizations:**
- **Predictions vs Actual** - How well the model predicts
- **Residual Plot** - Error distribution
- **Feature Importance** - Which features matter most

**3. Model Information:**
- Model ID
- Model type
- Target variable
- Feature names
- Training timestamp

### Step 6: Export Model

Click "Export Model" to download as JSON file.

**Use Cases for Exported Models:**
- Backup your trained models
- Share with team members
- Import into other systems
- Version control

---

## Manage Models

### View All Models

Go to `/models` page to see all your trained models.

**Model Card Shows:**
- Model name and type
- Training date
- Target variable
- Key metrics (RMSE, R², MAE, MSE)
- Feature list

### Export Model

Click "Export" button on any model card to download.

**File Format:** JSON
**Contains:**
- Model parameters
- Training metrics
- Feature names
- Trained coefficients

### Import Model

1. Go to `/build-model` page
2. Click "Import Model" button
3. Select a previously exported JSON file
4. Model will be loaded and ready to use

### Delete Model

Click the trash icon on any model card to delete.

**Warning:** This action cannot be undone!

---

## Tips & Best Practices

### Data Preparation

**Before Upload:**
1. **Clean your data** - Remove duplicates, fix typos
2. **Handle missing values** - Fill or remove
3. **Use consistent formats** - Dates, numbers, text
4. **Include headers** - First row should be column names

**Column Naming:**
- Use descriptive names: `sales_amount` not `col1`
- Avoid special characters: Use `_` instead of spaces
- Keep it simple: `date` not `Date_of_Transaction_YYYY_MM_DD`

### Model Training

**Choosing Target Column:**
- Must be numeric for regression
- Should have clear relationship with features
- Avoid columns with too many missing values

**Choosing Model Type:**
- **Start with Auto** - Let the system find the best model
- **Use Linear** - When you expect linear relationships
- **Use Polynomial** - When data shows curves
- **Use Random Forest** - For complex, non-linear patterns

**Test Size:**
- Default 20% is good for most cases
- Use 30% for small datasets (<100 rows)
- Use 10% for very large datasets (>10,000 rows)

### Interpreting Metrics

**RMSE (Root Mean Squared Error):**
- Measures average prediction error
- Same unit as your target variable
- Example: RMSE of 5 means predictions are off by ±5 on average

**R² (R-squared):**
- Measures how well model explains variance
- Range: 0 to 1 (higher is better)
- 0.7-0.9 = Good model
- 0.9-1.0 = Excellent model
- <0.5 = Poor model (try different features or model type)

**MAE (Mean Absolute Error):**
- Average absolute prediction error
- More intuitive than RMSE
- Less sensitive to outliers

### Common Issues

**Problem: "Model training failed"**
- Check if target column exists
- Ensure target column is numeric
- Verify dataset has enough rows (minimum 5)

**Problem: "Poor model performance (low R²)"**
- Try different model type
- Add more relevant features
- Check for data quality issues
- Consider collecting more data

**Problem: "API key invalid"**
- Verify API key is correct
- Check if API key is active
- Ensure no extra spaces in API key

**Problem: "Upload failed"**
- Check file size (<50MB)
- Verify file format (CSV or Excel)
- Ensure file is not corrupted

### Security Best Practices

1. **API Key Security:**
   - Never share your API key publicly
   - Don't commit API keys to git repositories
   - Regenerate if accidentally exposed

2. **Data Privacy:**
   - All data stored locally in browser
   - No data sent to external servers (except Gemini API for AI chat)
   - Clear browser data to remove all datasets

3. **Model Backup:**
   - Export important models regularly
   - Store exported models securely
   - Use version control for model files

---

## Troubleshooting

### Chat Not Working

**Symptoms:** AI doesn't respond or shows error

**Solutions:**
1. Check API key is configured correctly
2. Verify internet connection
3. Try different model (e.g., switch to `gemini-1.5-flash`)
4. Check if dataset is uploaded properly

### Training Takes Too Long

**Symptoms:** Model training stuck or very slow

**Solutions:**
1. Use smaller test size (10-15%)
2. Choose Linear or Polynomial instead of Random Forest
3. Reduce dataset size if very large (>50,000 rows)
4. Refresh page and try again

### Predictions Are Inaccurate

**Symptoms:** High RMSE, low R²

**Solutions:**
1. Try Auto mode to compare all models
2. Add more relevant features to dataset
3. Check for data quality issues
4. Consider if the relationship is predictable
5. Try Polynomial or Random Forest for non-linear patterns

---

## Examples

### Example 1: Sales Forecasting

**Dataset:**
```csv
date,sales,temperature,promotion,day_of_week
2024-01-01,100,25,0,1
2024-01-02,120,26,1,2
2024-01-03,110,24,0,3
```

**Steps:**
1. Upload dataset
2. Go to Build Model
3. Select target: `sales`
4. Choose model: Auto
5. Train and review results

**Expected Metrics:**
- R² > 0.7 (good prediction)
- RMSE < 20 (low error)

### Example 2: Price Prediction

**Dataset:**
```csv
area,bedrooms,bathrooms,age,price
1200,3,2,5,250000
1500,4,3,2,350000
900,2,1,10,180000
```

**Steps:**
1. Upload dataset
2. Build Model with target: `price`
3. Use Random Forest (complex relationships)
4. Export model for reuse

**Expected Results:**
- Feature importance: area > bedrooms > age
- R² > 0.8 (excellent)

---

## FAQ

**Q: Is my data secure?**
A: Yes! All data is stored locally in your browser. Only AI chat queries are sent to Gemini API.

**Q: Can I use this for commercial projects?**
A: Yes, but check Google Gemini API terms of service for usage limits.

**Q: What's the difference between model types?**
A: Linear is fastest but assumes linear relationships. Polynomial handles curves. Random Forest handles complex patterns but is slower.

**Q: Can I train classification models?**
A: Currently only regression (predicting numbers) is supported. Classification coming soon!

**Q: How accurate are the predictions?**
A: Depends on your data quality and relationships. R² > 0.7 is generally good.

**Q: Can I use this offline?**
A: No, internet connection required for AI chat and model training.

**Q: What's the maximum dataset size?**
A: 50MB file size limit. For larger datasets, consider sampling or aggregating.

**Q: Can I train multiple models on the same dataset?**
A: Yes! Train as many models as you want and compare their performance.

---

## Support

Need help? 
- Check this guide first
- Review API documentation
- Check GitHub issues: https://github.com/Cloud-Dark/ai-auto-analysis

---

**Last Updated:** October 2025
**Version:** 1.0.0
