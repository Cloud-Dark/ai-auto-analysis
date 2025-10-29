// REST API client for frontend

const API_BASE = "/api";

export interface Dataset {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  size: number;
  uploaded_at: string;
}

export interface ChatSession {
  id: string;
  dataset_id: string;
  gemini_api_key: string;
  model_name: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  dataset_id: string;
  session_id: string;
  analysis_type: string;
  result: any;
  created_at: string;
}

// Helper for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

// ==================== DATASETS ====================

export async function getDatasets(): Promise<Dataset[]> {
  return apiCall<Dataset[]>("/datasets");
}

export async function getDataset(id: string): Promise<Dataset> {
  return apiCall<Dataset>(`/datasets/${id}`);
}

export async function uploadDataset(file: File): Promise<Dataset> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/datasets`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

export async function deleteDataset(id: string): Promise<void> {
  await apiCall<void>(`/datasets/${id}`, { method: "DELETE" });
}

// ==================== SESSIONS ====================

export async function getSessions(): Promise<ChatSession[]> {
  return apiCall<ChatSession[]>("/sessions");
}

export async function getSession(id: string): Promise<ChatSession> {
  return apiCall<ChatSession>(`/sessions/${id}`);
}

export async function getSessionsByDataset(datasetId: string): Promise<ChatSession[]> {
  return apiCall<ChatSession[]>(`/datasets/${datasetId}/sessions`);
}

export async function createSession(data: {
  dataset_id: string;
  gemini_api_key: string;
  model_name: string;
  title?: string;
}): Promise<ChatSession> {
  return apiCall<ChatSession>("/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await apiCall<void>(`/sessions/${id}`, { method: "DELETE" });
}

// ==================== MESSAGES ====================

export async function getMessages(): Promise<ChatMessage[]> {
  return apiCall<ChatMessage[]>("/messages");
}

export async function getMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
  return apiCall<ChatMessage[]>(`/sessions/${sessionId}/messages`);
}

export async function createMessage(data: {
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
}): Promise<ChatMessage> {
  return apiCall<ChatMessage>("/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteMessage(id: string): Promise<void> {
  await apiCall<void>(`/messages/${id}`, { method: "DELETE" });
}

// ==================== ANALYSIS ====================

export async function getAnalysisResultsBySession(sessionId: string): Promise<AnalysisResult[]> {
  return apiCall<AnalysisResult[]>(`/sessions/${sessionId}/analysis`);
}

export async function saveAnalysisResult(data: {
  dataset_id: string;
  session_id: string;
  analysis_type: string;
  result: any;
}): Promise<void> {
  await apiCall<void>("/analysis", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==================== STREAMING ====================

export function createStreamingChat(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
) {
  const eventSource = new EventSource(
    `${API_BASE}/stream/chat?session_id=${sessionId}&message=${encodeURIComponent(message)}`
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "chunk") {
        onChunk(data.content);
      } else if (data.type === "done") {
        eventSource.close();
        onComplete();
      } else if (data.type === "error") {
        eventSource.close();
        onError(new Error(data.error));
      }
    } catch (error) {
      eventSource.close();
      onError(error as Error);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError(new Error("Stream connection error"));
  };

  return () => eventSource.close();
}
