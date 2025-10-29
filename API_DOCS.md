# AI Auto Analysis - API Documentation

Complete REST API documentation for developers.

## Base URL

```
http://localhost:3000/api
```

## Table of Contents

1. [Authentication](#authentication)
2. [Datasets API](#datasets-api)
3. [Sessions API](#sessions-api)
4. [Messages API](#messages-api)
5. [ML Models API](#ml-models-api)
6. [Streaming Chat API](#streaming-chat-api)
7. [Error Handling](#error-handling)

---

## Authentication

**No authentication required** for local development.

All endpoints are publicly accessible.

---

## Datasets API

### Upload Dataset

Upload a new CSV or Excel dataset.

**Endpoint:** `POST /api/datasets/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: File (CSV or Excel)
```

**Example (curl):**
```bash
curl -X POST http://localhost:3000/api/datasets/upload \
  -F "file=@/path/to/data.csv"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668068-7t0f7pbao",
    "name": "data.csv",
    "file_path": "/home/ubuntu/ai-auto-analysis/data/uploads/abc123",
    "file_type": "csv",
    "size": 1024,
    "created_at": "2025-10-29T04:21:08.068Z"
  }
}
```

---

### List All Datasets

Get all uploaded datasets.

**Endpoint:** `GET /api/datasets`

**Example:**
```bash
curl http://localhost:3000/api/datasets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1761711668068-7t0f7pbao",
      "name": "sales_data.csv",
      "file_type": "csv",
      "size": 2048,
      "created_at": "2025-10-29T04:21:08.068Z"
    }
  ]
}
```

---

### Get Single Dataset

Get details of a specific dataset.

**Endpoint:** `GET /api/datasets/:id`

**Parameters:**
- `id` (string, required) - Dataset ID

**Example:**
```bash
curl http://localhost:3000/api/datasets/1761711668068-7t0f7pbao
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668068-7t0f7pbao",
    "name": "sales_data.csv",
    "file_path": "/home/ubuntu/ai-auto-analysis/data/uploads/abc123",
    "file_type": "csv",
    "size": 2048,
    "created_at": "2025-10-29T04:21:08.068Z"
  }
}
```

---

### Delete Dataset

Delete a dataset and all related data.

**Endpoint:** `DELETE /api/datasets/:id`

**Parameters:**
- `id` (string, required) - Dataset ID

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/datasets/1761711668068-7t0f7pbao
```

**Response:**
```json
{
  "success": true,
  "message": "Dataset deleted successfully"
}
```

---

## Sessions API

### Create Session

Create a new chat session with AI.

**Endpoint:** `POST /api/sessions`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "dataset_id": "1761711668068-7t0f7pbao",
  "gemini_api_key": "AIzaSy...",
  "model_name": "gemini-2.0-flash-lite",
  "title": "Sales Analysis" // optional
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "1761711668068-7t0f7pbao",
    "gemini_api_key": "AIzaSy...",
    "model_name": "gemini-2.0-flash-lite"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668100-xyz123",
    "dataset_id": "1761711668068-7t0f7pbao",
    "model_name": "gemini-2.0-flash-lite",
    "title": "Sales Analysis",
    "created_at": "2025-10-29T04:21:08.100Z"
  }
}
```

---

### List All Sessions

Get all chat sessions.

**Endpoint:** `GET /api/sessions`

**Example:**
```bash
curl http://localhost:3000/api/sessions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1761711668100-xyz123",
      "dataset_id": "1761711668068-7t0f7pbao",
      "model_name": "gemini-2.0-flash-lite",
      "title": "Sales Analysis",
      "created_at": "2025-10-29T04:21:08.100Z"
    }
  ]
}
```

---

### Get Single Session

Get details of a specific session.

**Endpoint:** `GET /api/sessions/:id`

**Parameters:**
- `id` (string, required) - Session ID

**Example:**
```bash
curl http://localhost:3000/api/sessions/1761711668100-xyz123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668100-xyz123",
    "dataset_id": "1761711668068-7t0f7pbao",
    "model_name": "gemini-2.0-flash-lite",
    "title": "Sales Analysis",
    "created_at": "2025-10-29T04:21:08.100Z"
  }
}
```

---

### Get Sessions by Dataset

Get all sessions for a specific dataset.

**Endpoint:** `GET /api/datasets/:id/sessions`

**Parameters:**
- `id` (string, required) - Dataset ID

**Example:**
```bash
curl http://localhost:3000/api/datasets/1761711668068-7t0f7pbao/sessions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1761711668100-xyz123",
      "dataset_id": "1761711668068-7t0f7pbao",
      "model_name": "gemini-2.0-flash-lite",
      "title": "Sales Analysis",
      "created_at": "2025-10-29T04:21:08.100Z"
    }
  ]
}
```

---

### Delete Session

Delete a chat session and all messages.

**Endpoint:** `DELETE /api/sessions/:id`

**Parameters:**
- `id` (string, required) - Session ID

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/sessions/1761711668100-xyz123
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## Messages API

### List Messages

Get all messages for a session.

**Endpoint:** `GET /api/sessions/:id/messages`

**Parameters:**
- `id` (string, required) - Session ID

**Example:**
```bash
curl http://localhost:3000/api/sessions/1761711668100-xyz123/messages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1761711668200-msg1",
      "session_id": "1761711668100-xyz123",
      "role": "user",
      "content": "Please perform EDA on my data",
      "created_at": "2025-10-29T04:21:08.200Z"
    },
    {
      "id": "1761711668300-msg2",
      "session_id": "1761711668100-xyz123",
      "role": "assistant",
      "content": "Here's the exploratory data analysis...",
      "created_at": "2025-10-29T04:21:08.300Z"
    }
  ]
}
```

---

## ML Models API

### Train Model

Train a new machine learning model.

**Endpoint:** `POST /api/ml/train`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "dataset_id": "1761711668068-7t0f7pbao",
  "target_column": "sales",
  "model_type": "linear", // "linear", "polynomial", "random_forest", "auto"
  "test_size": 0.2, // optional, default 0.2
  "options": {
    "name": "Sales Predictor", // optional
    "degree": 2 // for polynomial only
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "1761711668068-7t0f7pbao",
    "target_column": "sales",
    "model_type": "linear",
    "test_size": 0.2,
    "options": {
      "name": "Sales Predictor"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "model": {
      "id": "1761711668400-model1",
      "name": "Sales Predictor",
      "type": "linear",
      "metrics": {
        "rmse": 4.69,
        "mse": 22.02,
        "mae": 4.69,
        "r2": 0.85,
        "mape": 3.91
      },
      "model": {
        "slope": 8.15,
        "intercept": -87.31,
        "coefficients": [8.15]
      },
      "featureNames": ["temperature"],
      "targetName": "sales",
      "trainedAt": "2025-10-29T04:21:08.400Z",
      "datasetId": "1761711668068-7t0f7pbao"
    },
    "predictions": [
      { "actual": 100, "predicted": 103.5 },
      { "actual": 120, "predicted": 118.2 }
    ]
  }
}
```

---

### List All Models

Get all trained models.

**Endpoint:** `GET /api/ml/models`

**Example:**
```bash
curl http://localhost:3000/api/ml/models
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1761711668400-model1",
      "name": "Sales Predictor",
      "type": "linear",
      "metrics": {
        "rmse": 4.69,
        "mse": 22.02,
        "mae": 4.69,
        "r2": 0.85,
        "mape": 3.91
      },
      "targetName": "sales",
      "trainedAt": "2025-10-29T04:21:08.400Z"
    }
  ]
}
```

---

### Get Single Model

Get details of a specific model.

**Endpoint:** `GET /api/ml/models/:id`

**Parameters:**
- `id` (string, required) - Model ID

**Example:**
```bash
curl http://localhost:3000/api/ml/models/1761711668400-model1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668400-model1",
    "name": "Sales Predictor",
    "type": "linear",
    "metrics": {
      "rmse": 4.69,
      "mse": 22.02,
      "mae": 4.69,
      "r2": 0.85,
      "mape": 3.91
    },
    "model": {
      "slope": 8.15,
      "intercept": -87.31,
      "coefficients": [8.15]
    },
    "featureNames": ["temperature"],
    "targetName": "sales",
    "trainedAt": "2025-10-29T04:21:08.400Z",
    "datasetId": "1761711668068-7t0f7pbao"
  }
}
```

---

### Export Model

Download a trained model as JSON.

**Endpoint:** `GET /api/ml/models/:id/export`

**Parameters:**
- `id` (string, required) - Model ID

**Example:**
```bash
curl http://localhost:3000/api/ml/models/1761711668400-model1/export \
  -o model.json
```

**Response:** JSON file download

---

### Import Model

Import a previously exported model.

**Endpoint:** `POST /api/ml/models/import`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: File (JSON)
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/ml/models/import \
  -F "file=@/path/to/model.json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1761711668500-model2",
    "name": "Imported Model",
    "type": "linear",
    "metrics": { ... },
    "trainedAt": "2025-10-29T04:21:08.500Z"
  }
}
```

---

### Predict with Model

Make predictions using a trained model.

**Endpoint:** `POST /api/ml/models/:id/predict`

**Content-Type:** `application/json`

**Parameters:**
- `id` (string, required) - Model ID

**Request Body:**
```json
{
  "features": {
    "temperature": 27
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/ml/models/1761711668400-model1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "temperature": 27
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prediction": 132.74,
    "features": {
      "temperature": 27
    },
    "model_id": "1761711668400-model1"
  }
}
```

---

### Delete Model

Delete a trained model.

**Endpoint:** `DELETE /api/ml/models/:id`

**Parameters:**
- `id` (string, required) - Model ID

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/ml/models/1761711668400-model1
```

**Response:**
```json
{
  "success": true,
  "message": "Model deleted successfully"
}
```

---

## Streaming Chat API

### Send Message (Streaming)

Send a message and receive AI response as a stream.

**Endpoint:** `POST /api/chat/stream`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "session_id": "1761711668100-xyz123",
  "message": "Please perform EDA on my data",
  "dataset_path": "/home/ubuntu/ai-auto-analysis/data/uploads/abc123",
  "api_key": "AIzaSy...",
  "model": "gemini-2.0-flash-lite"
}
```

**Response:** Server-Sent Events (SSE) stream

**Event Types:**
- `data: {"type": "status", "content": "Loading dataset..."}` - Status update
- `data: {"type": "token", "content": "Here"}` - Text token
- `data: {"type": "done"}` - Stream complete

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: '1761711668100-xyz123',
    message: 'Please perform EDA on my data',
    dataset_path: '/path/to/dataset',
    api_key: 'AIzaSy...',
    model: 'gemini-2.0-flash-lite'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Common Errors

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required fields: dataset_id, gemini_api_key, model_name"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Dataset not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to read dataset file"
}
```

---

## Rate Limits

**No rate limits** for local development.

For production deployment, consider implementing:
- Rate limiting per IP
- API key quotas
- Request throttling

---

## Data Storage

All data is stored locally in JSON files:

```
data/
  ├── database.json      # Main database (datasets, sessions, messages)
  ├── uploads/           # Uploaded dataset files
  ├── models/            # Trained ML models
  ├── vectors.json       # Embeddings for semantic search
  └── analysis.json      # Cached analysis results
```

---

## Testing

Run integration tests:

```bash
./test-integration.sh
```

This will test:
- Dataset upload
- Session creation
- Model training
- Model export
- Model deletion

---

## Examples

### Complete Workflow Example

```bash
# 1. Upload dataset
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/datasets/upload \
  -F "file=@sales_data.csv")
DATASET_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.id')

# 2. Create session
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d "{
    \"dataset_id\": \"$DATASET_ID\",
    \"gemini_api_key\": \"AIzaSy...\",
    \"model_name\": \"gemini-2.0-flash-lite\"
  }")
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.data.id')

# 3. Train model
TRAIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ml/train \
  -H "Content-Type: application/json" \
  -d "{
    \"dataset_id\": \"$DATASET_ID\",
    \"target_column\": \"sales\",
    \"model_type\": \"auto\",
    \"options\": {
      \"name\": \"Sales Predictor\"
    }
  }")
MODEL_ID=$(echo $TRAIN_RESPONSE | jq -r '.data.model.id')

# 4. Make prediction
curl -X POST http://localhost:3000/api/ml/models/$MODEL_ID/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "temperature": 27,
      "promotion": 1
    }
  }'

# 5. Export model
curl http://localhost:3000/api/ml/models/$MODEL_ID/export \
  -o sales_predictor.json

# 6. Cleanup
curl -X DELETE http://localhost:3000/api/ml/models/$MODEL_ID
curl -X DELETE http://localhost:3000/api/sessions/$SESSION_ID
curl -X DELETE http://localhost:3000/api/datasets/$DATASET_ID
```

---

**Last Updated:** October 2025
**Version:** 1.0.0
