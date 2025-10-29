# AI Auto Analysis

Automated AI-powered data analysis application with natural language interface. Upload your dataset, configure Gemini AI, and chat with your data to perform EDA, forecasting, and comprehensive analysis.

## ✨ Features

- **📊 Dataset Upload** - Drag-and-drop CSV/Excel files (up to 50MB)
- **🤖 AI-Powered Analysis** - Natural language interface using Google Gemini
- **📈 Exploratory Data Analysis (EDA)** - Automated statistical analysis and visualizations
- **🔮 Forecasting** - Time-series prediction and trend analysis
- **💬 Streaming Chat** - Real-time AI responses with markdown rendering
- **🔒 Privacy-First** - All data stored locally in JSON files
- **🚀 No Authentication** - Public access, perfect for internal tools

## 🏗️ Architecture

**100% TypeScript/Node.js** - No Python dependencies!

### Tech Stack

- **Frontend**: React 19 + Tailwind CSS 4 + Wouter (routing)
- **Backend**: Express 4 + REST API
- **AI**: Google Gemini API with function calling
- **Data Storage**: Pure JSON files (no database required)
- **Analysis**: Custom TypeScript implementation with simple-statistics
- **File Processing**: papaparse (CSV) + xlsx (Excel)

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ 
- pnpm (or npm/yarn)
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone repository
git clone https://github.com/Cloud-Dark/ai-auto-analysis.git
cd ai-auto-analysis

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage

### 1. Upload Dataset
- Navigate to `/upload`
- Drag and drop your CSV or Excel file

### 2. Configure AI
- Enter your Gemini API key
- Choose a model (gemini-2.0-flash-exp recommended)

### 3. Chat with Your Data
Ask questions like:
- "Please perform comprehensive EDA on my data"
- "Forecast sales for the next 30 days"

## 🔧 API Endpoints

### Datasets
- `GET /api/datasets` - List all datasets
- `POST /api/datasets` - Upload dataset
- `DELETE /api/datasets/:id` - Delete dataset

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session

### Streaming
- `GET /api/stream/chat` - Streaming chat (SSE)

## 🗄️ Data Storage

All data stored locally in JSON files:
- `data/database.json` - Main database
- `data/uploads/` - Uploaded files

No external database required!

## 📄 License

MIT License

---

**Made with ❤️ for data analysts**
