# AI Auto Analysis - Developer Guide

Guide for developers who want to contribute or extend the platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup Development Environment](#setup-development-environment)
5. [Adding New Features](#adding-new-features)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

---

## Architecture Overview

AI Auto Analysis follows a **client-side first** architecture with minimal backend:

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + Tailwind CSS + Wouter + Recharts      │
│  - Upload datasets                               │
│  - Configure AI                                  │
│  - Chat interface                                │
│  - No-code model builder                         │
│  - Model management                              │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│                   Backend                        │
│  Express + TypeScript                            │
│  - Dataset management                            │
│  - Session management                            │
│  - ML model training                             │
│  - AI streaming (Gemini API)                     │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│                Data Storage                      │
│  - JSON files (database.json)                    │
│  - File system (uploads/, models/)               │
│  - No external database required                 │
└──────────────────────────────────────────────────┘
```

### Key Design Decisions

**Why JSON instead of SQL?**
- Simplicity: No database setup required
- Portability: Easy to backup and restore
- Transparency: Human-readable data format
- Performance: Sufficient for small to medium datasets

**Why No Authentication?**
- Local-first: Designed for personal/team use
- Privacy: No user data sent to external servers
- Simplicity: Reduces complexity for deployment

**Why TypeScript Only?**
- Type safety: Catch errors at compile time
- Better IDE support: Autocomplete and refactoring
- Single language: Easier to maintain

---

## Tech Stack

### Frontend

- **React 19** - UI framework
- **Tailwind CSS 4** - Styling
- **Wouter** - Lightweight routing
- **Recharts** - Data visualization
- **Shadcn/UI** - Component library
- **Lucide React** - Icons

### Backend

- **Node.js 22** - Runtime
- **Express 4** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Multer** - File upload handling
- **PapaCSV** - CSV parsing
- **XLSX** - Excel file handling

### AI & ML

- **@google/generative-ai** - Gemini API client
- **simple-statistics** - Statistical calculations
- **ml-regression** - Machine learning models

### Development Tools

- **Vite** - Build tool and dev server
- **Vitest** - Testing framework
- **TSX** - TypeScript execution
- **PNPM** - Package manager

---

## Project Structure

```
ai-auto-analysis/
├── client/                    # Frontend code
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/            # Shadcn/UI components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts         # REST API client
│   │   │   └── utils.ts       # Helper functions
│   │   ├── pages/             # Page components
│   │   │   ├── Home.tsx       # Landing page
│   │   │   ├── Upload.tsx     # Dataset upload
│   │   │   ├── Config.tsx     # AI configuration
│   │   │   ├── Chat.tsx       # AI chat interface
│   │   │   ├── BuildModel.tsx # No-code model builder
│   │   │   └── Models.tsx     # Model management
│   │   ├── App.tsx            # Routes and layout
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   └── index.html             # HTML template
├── server/                    # Backend code
│   ├── _core/                 # Core server setup
│   │   ├── index.ts           # Express app setup
│   │   └── env.ts             # Environment variables
│   ├── ai-tools.ts            # AI tools (EDA, forecast)
│   ├── enhanced-ai-tools.ts   # Enhanced EDA tools
│   ├── ml-models.ts           # ML model training
│   ├── api.ts                 # REST API routes
│   ├── model-api.ts           # ML model API routes
│   ├── simple-stream.ts       # Streaming chat endpoint
│   ├── json-db.ts             # JSON database service
│   └── api.test.ts            # API tests
├── data/                      # Data storage (gitignored)
│   ├── database.json          # Main database
│   ├── uploads/               # Uploaded datasets
│   ├── models/                # Trained ML models
│   ├── vectors.json           # Embeddings
│   └── analysis.json          # Cached analysis
├── test-integration.sh        # Integration test script
├── vitest.config.ts           # Test configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── README.md                  # Project overview
├── USER_GUIDE.md              # User documentation
├── API_DOCS.md                # API documentation
└── DEVELOPER_GUIDE.md         # This file
```

---

## Setup Development Environment

### Prerequisites

- **Node.js** 22.x or higher
- **PNPM** 9.x or higher
- **Git**

### Installation

```bash
# Clone repository
git clone https://github.com/Cloud-Dark/ai-auto-analysis.git
cd ai-auto-analysis

# Install dependencies
pnpm install

# Create data directory
mkdir -p data/uploads data/models

# Start development server
pnpm dev
```

### Development Server

```bash
pnpm dev
```

This starts:
- Frontend dev server: `http://localhost:5173`
- Backend API server: `http://localhost:3000`
- Hot module replacement (HMR) enabled

### Build for Production

```bash
pnpm build
```

Output:
- Frontend: `client/dist/`
- Backend: Runs directly from `server/`

### Run Tests

```bash
# Unit tests
pnpm test

# Integration tests
./test-integration.sh

# Test with coverage
pnpm test --coverage
```

---

## Adding New Features

### Adding a New API Endpoint

**1. Define the endpoint in `server/api.ts`:**

```typescript
// GET /api/example
router.get("/example", (req, res) => {
  try {
    const data = { message: "Hello World" };
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**2. Add to API client (`client/src/lib/api.ts`):**

```typescript
export const api = {
  // ... existing methods
  
  getExample: async () => {
    const response = await fetch(`${API_BASE}/example`);
    return response.json();
  },
};
```

**3. Use in React component:**

```typescript
import { api } from "@/lib/api";

function ExampleComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    api.getExample().then(result => {
      if (result.success) {
        setData(result.data);
      }
    });
  }, []);
  
  return <div>{data?.message}</div>;
}
```

---

### Adding a New AI Tool

**1. Define tool in `server/ai-tools.ts`:**

```typescript
const exampleTool: Tool = {
  functionDeclarations: [
    {
      name: "example_analysis",
      description: "Perform example analysis on dataset",
      parameters: {
        type: "object",
        properties: {
          column_name: {
            type: "string",
            description: "Column to analyze",
          },
        },
        required: ["column_name"],
      },
    },
  ],
};

// Add to allTools array
export const allTools: Tool[] = [edaTool, forecastTool, exampleTool];
```

**2. Implement tool function:**

```typescript
async function handleExampleAnalysis(args: any): Promise<any> {
  const { column_name } = args;
  
  if (!currentDataset || !currentDataset[column_name]) {
    throw new Error(`Column ${column_name} not found`);
  }
  
  const values = currentDataset[column_name];
  const result = {
    column: column_name,
    count: values.length,
    // ... your analysis logic
  };
  
  return result;
}
```

**3. Register in tool handler:**

```typescript
export async function handleToolCall(toolCall: any): Promise<any> {
  const { name, args } = toolCall;
  
  switch (name) {
    case "perform_eda":
      return await handleEDA(args);
    case "forecast_data":
      return await handleForecast(args);
    case "example_analysis":
      return await handleExampleAnalysis(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

---

### Adding a New ML Model Type

**1. Implement model in `server/ml-models.ts`:**

```typescript
async function trainExampleModel(
  X: number[][],
  y: number[],
  options?: any
): Promise<any> {
  // Your model training logic
  const model = {
    // model parameters
  };
  
  // Make predictions
  const predictions = X.map(features => {
    // prediction logic
    return predicted_value;
  });
  
  return { model, predictions };
}
```

**2. Add to model type switch:**

```typescript
export async function trainModel(
  dataset: Record<string, any[]>,
  targetColumn: string,
  modelType: string,
  testSize: number = 0.2,
  options?: any
): Promise<TrainResult> {
  // ... existing code
  
  let model: any;
  let predictions: number[];
  
  switch (modelType) {
    case "linear":
      ({ model, predictions } = await trainLinearRegression(X_test, y_test));
      break;
    case "polynomial":
      ({ model, predictions } = await trainPolynomialRegression(X_test, y_test, options?.degree));
      break;
    case "random_forest":
      ({ model, predictions } = await trainRandomForest(X_test, y_test, options));
      break;
    case "example":
      ({ model, predictions } = await trainExampleModel(X_test, y_test, options));
      break;
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
  
  // ... rest of code
}
```

**3. Update frontend model selector:**

```typescript
// In BuildModel.tsx
<Select value={modelType} onValueChange={setModelType}>
  <SelectTrigger>
    <SelectValue placeholder="Select model type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="auto">Auto (Compare All)</SelectItem>
    <SelectItem value="linear">Linear Regression</SelectItem>
    <SelectItem value="polynomial">Polynomial Regression</SelectItem>
    <SelectItem value="random_forest">Random Forest</SelectItem>
    <SelectItem value="example">Example Model</SelectItem>
  </SelectContent>
</Select>
```

---

### Adding a New Page

**1. Create page component (`client/src/pages/NewPage.tsx`):**

```typescript
export default function NewPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">New Feature</h1>
      {/* Your content */}
    </div>
  );
}
```

**2. Add route in `client/src/App.tsx`:**

```typescript
import NewPage from "./pages/NewPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/upload" component={Upload} />
      <Route path="/config" component={Config} />
      <Route path="/chat" component={Chat} />
      <Route path="/build-model" component={BuildModel} />
      <Route path="/models" component={Models} />
      <Route path="/new-page" component={NewPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

**3. Add navigation link:**

```typescript
// In Home.tsx or navigation component
<Link href="/new-page">
  <Button>Go to New Feature</Button>
</Link>
```

---

## Testing

### Unit Tests

Create test files with `.test.ts` extension:

```typescript
// server/example.test.ts
import { describe, it, expect } from "vitest";
import { exampleFunction } from "./example";

describe("Example Function", () => {
  it("should return correct result", () => {
    const result = exampleFunction(5);
    expect(result).toBe(10);
  });
  
  it("should handle edge cases", () => {
    expect(exampleFunction(0)).toBe(0);
    expect(exampleFunction(-5)).toBe(-10);
  });
});
```

Run tests:
```bash
pnpm test
```

### Integration Tests

Add test cases to `test-integration.sh`:

```bash
# Test new endpoint
echo "✅ Test: New Feature"
curl -s "$BASE_URL/api/new-feature" | jq .
echo ""
```

Run integration tests:
```bash
./test-integration.sh
```

### Testing Checklist

Before submitting a PR, ensure:
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] Code is formatted (Prettier)
- [ ] No console errors in browser
- [ ] Tested on Chrome and Firefox
- [ ] Mobile responsive (if UI changes)

---

## Deployment

### Local Deployment

```bash
# Build frontend
pnpm build

# Start production server
NODE_ENV=production node server/_core/index.ts
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/_core/index.ts"]
```

Build and run:
```bash
docker build -t ai-auto-analysis .
docker run -p 3000:3000 -v $(pwd)/data:/app/data ai-auto-analysis
```

### Environment Variables

Create `.env` file:

```env
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data
```

Load in application:
```typescript
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || "./data";
```

---

## Contributing

### Code Style

**TypeScript:**
- Use `const` for immutable variables
- Use `let` for mutable variables
- Avoid `var`
- Use arrow functions for callbacks
- Use async/await instead of promises
- Add types for all function parameters and return values

**React:**
- Use functional components
- Use hooks (useState, useEffect, etc.)
- Extract reusable logic into custom hooks
- Keep components small and focused
- Use TypeScript interfaces for props

**Naming Conventions:**
- Components: PascalCase (`MyComponent.tsx`)
- Functions: camelCase (`handleClick`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Files: kebab-case (`my-component.tsx`)

### Git Workflow

**1. Create feature branch:**
```bash
git checkout -b feature/new-feature
```

**2. Make changes and commit:**
```bash
git add .
git commit -m "Add new feature: description"
```

**3. Push to GitHub:**
```bash
git push origin feature/new-feature
```

**4. Create Pull Request**

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add polynomial regression model

Implement polynomial regression with configurable degree.
Includes training, prediction, and metrics calculation.

Closes #123
```

```
fix: Handle missing values in EDA

Check for null/undefined values before calculating statistics.
Prevents NaN errors in correlation matrix.
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tested locally
- [ ] No merge conflicts

---

## Troubleshooting

### Common Development Issues

**Issue: `pnpm install` fails**

Solution:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Issue: TypeScript errors**

Solution:
```bash
# Check for errors
pnpm tsc --noEmit

# Fix auto-fixable issues
pnpm tsc --noEmit --pretty
```

**Issue: Port already in use**

Solution:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Issue: Data directory not found**

Solution:
```bash
mkdir -p data/uploads data/models
```

---

## Resources

- **React Documentation**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev
- **Vitest**: https://vitest.dev
- **Google Gemini API**: https://ai.google.dev
- **TypeScript**: https://www.typescriptlang.org

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** October 2025
**Version:** 1.0.0
