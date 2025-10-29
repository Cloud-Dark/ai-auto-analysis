# AI Auto Analysis

🤖 AI-powered automated data analysis application with Google Gemini, built with TypeScript and React.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-8E75B2?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

## ✨ Features

- **📊 Dataset Upload**: Support for CSV and Excel files (up to 50MB)
- **🤖 AI-Powered Analysis**: Integrated with Google Gemini AI
- **📈 Exploratory Data Analysis (EDA)**: Statistical summaries, correlation matrices, visualizations
- **🔮 Time Series Forecasting**: Exponential smoothing predictions
- **💬 Streaming Chat Interface**: Real-time AI responses with Server-Sent Events
- **🎯 Custom Model Selection**: Support for any Gemini model (2.5-flash-lite, 2.0-flash-exp, etc.)
- **🔒 Privacy-First**: All data stored locally in browser (localStorage)
- **⚡ 100% TypeScript**: No Python dependencies, pure Node.js backend

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm
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

- Drag and drop a CSV or Excel file
- Or click "Browse Files" to select a file
- Maximum file size: 50MB

### 2. Configure AI Model

- Enter your Gemini API key
- Choose or enter a model name:
  - `gemini-2.5-flash-lite` - Fastest, most efficient
  - `gemini-2.5-flash` - Balanced speed and capability
  - `gemini-2.0-flash-exp` - Experimental features
  - `gemini-1.5-pro` - Most capable
  - Or any other Gemini model

### 3. Chat with Your Data

Ask questions like:
- `"Please perform comprehensive EDA on my data"`
- `"Show me the correlation between variables"`
- `"Forecast sales for the next 30 days"`
- `"What are the main insights from this dataset?"`

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS 4
- Wouter (routing)
- localStorage (data persistence)

**Backend:**
- Express 4
- TypeScript
- Google Generative AI SDK
- simple-statistics (data analysis)
- papaparse (CSV parsing)
- xlsx (Excel support)

### Data Flow

```
User uploads dataset → Stored in localStorage
User configures Gemini API → Stored in localStorage
User sends message → Backend streams AI response
AI uses function calling → Executes analysis tools
Results streamed back → Displayed in real-time
```

### AI Tools

The application uses Gemini function calling with TypeScript tools:

- **perform_eda**: Exploratory data analysis with statistical summaries
- **forecast_data**: Time series forecasting with exponential smoothing
- **get_column_info**: Dataset structure and column information

## 📁 Project Structure

```
client/
  src/
    pages/
      Home.tsx        - Landing page
      Upload.tsx      - Dataset upload
      Config.tsx      - AI model configuration
      Chat.tsx        - Streaming chat interface
    lib/
      storage.ts      - localStorage service
      trpc.ts         - tRPC client
server/
  ai-tools.ts         - TypeScript AI analysis tools
  simple-stream.ts    - SSE streaming endpoint
  routers.ts          - tRPC procedures
  db.ts               - Database queries (optional)
```

## 🔧 Configuration

### Environment Variables

No environment variables required for basic usage. All configuration is done through the UI.

For deployment, you may want to set:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 🚢 Deployment

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## 🛠️ Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:push` - Push database schema changes

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) - AI model
- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [simple-statistics](https://simplestatistics.org/) - Statistical analysis
- [papaparse](https://www.papaparse.com/) - CSV parsing

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ using TypeScript and Gemini AI
