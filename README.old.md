# AI Auto Analysis

Automated AI-powered data analysis application with exploratory data analysis (EDA) and forecasting capabilities using Google Gemini.

## Features

- **Dataset Upload**: Drag-and-drop interface for CSV and Excel files (up to 50MB)
- **AI Configuration**: Secure Gemini API key configuration per session
- **Streaming Chat Interface**: Real-time AI responses with Server-Sent Events (SSE)
- **Exploratory Data Analysis**: 
  - Statistical summaries
  - Correlation matrices and heatmaps
  - Distribution plots and box plots
  - Missing value analysis
- **Time Series Forecasting**:
  - Prophet model for seasonal forecasting
  - ARIMA model for time series prediction
  - Automatic model selection
- **Natural Language Interface**: Ask questions in plain English

## Tech Stack

### Frontend
- React 19
- Tailwind CSS 4
- tRPC 11
- Wouter (routing)
- Streamdown (markdown rendering)

### Backend
- Express 4
- tRPC 11
- MySQL/TiDB (database)
- S3 (file storage)

### AI & Analysis
- Google Gemini AI (@google/generative-ai)
- simple-statistics (statistical analysis)
- papaparse (CSV parsing)
- xlsx (Excel file support)
- Custom TypeScript implementation for EDA and forecasting

## Setup

### Prerequisites
- Node.js 22+
- pnpm
- MySQL/TiDB database

### Installation

1. Install Node.js dependencies:
```bash
pnpm install
```

2. Setup database:
```bash
pnpm db:push
```

3. Start development server:
```bash
pnpm dev
```

## Usage

### 1. Upload Dataset
- Navigate to the upload page
- Drag and drop a CSV or Excel file, or click "Browse Files"
- Supported formats: CSV, XLSX, XLS
- Maximum file size: 50MB

### 2. Configure Gemini API
- Enter your Gemini API key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))
- The API key is stored securely and only used for this session
- Click "Start Analysis" to create a chat session

### 3. Chat with AI
Try these example commands:
- `"Please perform EDA on my data"` - Comprehensive exploratory data analysis
- `"Show me the correlation between variables"` - Correlation matrix and heatmap
- `"Forecast the sales column for the next 30 days"` - Time series forecasting
- `"What are the main insights from this dataset?"` - AI-powered insights
- `"Analyze the distribution of temperature"` - Distribution plots

### Example Workflow

1. Upload `test_data.csv` (included in project)
2. Configure your Gemini API key
3. Ask: `"Please perform comprehensive EDA on my data"`
4. AI will analyze:
   - Dataset structure (4 columns, 30 rows)
   - Statistical summaries
   - Correlation matrix with heatmap
   - Distribution plots for numeric columns
5. Ask: `"Forecast sales for the next 7 days"`
6. AI will generate forecast with visualization

## Architecture

### Data Flow
1. User uploads dataset → Stored in S3
2. User configures Gemini API → Stored in database (encrypted)
3. User sends message → Saved to database
4. Backend downloads dataset from S3 to temp file
5. TypeScript module loads dataset into memory
6. Gemini AI with function calling uses tools (EDA, forecasting) to analyze data
7. Results streamed back to frontend via SSE
8. Visualizations displayed as Plotly chart data

### AI Tools
The application uses Gemini function calling with TypeScript tools:

- **perform_eda**: Exploratory data analysis with statistical summaries and correlation matrices
- **forecast_data**: Time series forecasting with exponential smoothing
- **get_column_info**: Dataset structure and column information

### Streaming Architecture
- Backend: Express + SSE (Server-Sent Events)
- AI: Gemini streaming API with function calling
- Frontend: Fetch with ReadableStream for SSE parsing

## API Endpoints

### tRPC Procedures
- `dataset.upload` - Upload dataset file
- `dataset.list` - List user's datasets
- `dataset.get` - Get dataset by ID
- `chat.createSession` - Create new chat session
- `chat.listSessions` - List user's chat sessions
- `chat.getSession` - Get session by ID
- `chat.getMessages` - Get session messages
- `chat.sendMessage` - Send message to session

### REST Endpoints
- `POST /api/chat/stream` - Streaming chat endpoint (SSE)

## Database Schema

### Tables
- `users` - User authentication
- `datasets` - Uploaded datasets metadata
- `chatSessions` - Chat sessions with API keys
- `chatMessages` - Chat message history

## Security

- API keys stored encrypted in database
- Session-based authentication with JWT
- File uploads validated (type, size)
- S3 storage with non-enumerable paths
- CORS and rate limiting enabled

## Development

### Project Structure
```
client/
  src/
    pages/
      Home.tsx        - Landing page
      Upload.tsx      - Dataset upload
      Config.tsx      - Gemini API configuration
      Chat.tsx        - Streaming chat interface
server/
  routers.ts          - tRPC procedures
  chat-stream-ts.ts   - SSE streaming endpoint (TypeScript)
  ai-tools.ts         - TypeScript AI analysis tools
  db.ts               - Database queries
drizzle/
  schema.ts           - Database schema
```

### Adding New Analysis Tools

1. Add tool function in `server/ai-tools.ts`:
```typescript
export async function myAnalysis(param: string): Promise<any> {
  // Your analysis logic
  return { result: "analysis data" };
}
```

2. Register tool in `createAIAgent()`:
```typescript
const tools = [
  {
    name: "my_analysis",
    description: "Tool description",
    parameters: {
      type: "object",
      properties: {
        param: { type: "string", description: "Parameter description" },
      },
      required: ["param"],
    },
  },
];
```

3. Add case in `executeFunctionCall()`:
```typescript
case "my_analysis":
  return await myAnalysis(args.param);
```

## Testing

Test file included: `test_data.csv`
- 30 rows of sales data
- 4 columns: date, sales, temperature, customers
- Good for testing EDA and forecasting

## Deployment

1. Save checkpoint:
```bash
# Changes are automatically tracked
```

2. Click "Publish" button in Management UI

3. Configure environment variables in Settings → Secrets
### Troubleshooting

### Database connection error
```bash
pnpm db:push
```

### Streaming not working
- Check server logs for errors: `pnpm dev`
- Verify Gemini API key is valid
- Check network connectivity

## License

MIT

## Credits

Built with Manus platform
- LangChain for AI orchestration
- Google Gemini for language model
- Prophet for forecasting
- React + Tailwind for UI
