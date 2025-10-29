/**
 * Local Storage Service
 * Manages all data persistence in browser localStorage
 */

export interface Dataset {
  id: string;
  name: string;
  fileContent: string; // CSV/Excel content as string
  fileType: string; // 'csv' | 'xlsx' | 'xls'
  size: number;
  uploadedAt: string;
}

export interface ChatSession {
  id: string;
  datasetId: string;
  geminiApiKey: string;
  modelName: string;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
}

const STORAGE_KEYS = {
  DATASETS: 'ai-analysis-datasets',
  SESSIONS: 'ai-analysis-sessions',
  MESSAGES: 'ai-analysis-messages',
  CURRENT_SESSION: 'ai-analysis-current-session',
};

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Dataset operations
export function saveDataset(dataset: Omit<Dataset, 'id' | 'uploadedAt'>): Dataset {
  const datasets = getDatasets();
  const newDataset: Dataset = {
    ...dataset,
    id: generateId(),
    uploadedAt: new Date().toISOString(),
  };
  datasets.push(newDataset);
  localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(datasets));
  return newDataset;
}

export function getDatasets(): Dataset[] {
  const data = localStorage.getItem(STORAGE_KEYS.DATASETS);
  return data ? JSON.parse(data) : [];
}

export function getDataset(id: string): Dataset | null {
  const datasets = getDatasets();
  return datasets.find(d => d.id === id) || null;
}

export function deleteDataset(id: string): void {
  const datasets = getDatasets().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(datasets));
  
  // Also delete related sessions and messages
  const sessions = getSessions().filter(s => s.datasetId !== id);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  
  const sessionIds = sessions.map(s => s.id);
  const messages = getMessages().filter(m => sessionIds.includes(m.sessionId));
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

// Session operations
export function createSession(session: Omit<ChatSession, 'id' | 'createdAt'>): ChatSession {
  const sessions = getSessions();
  const newSession: ChatSession = {
    ...session,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  sessions.push(newSession);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, newSession.id);
  return newSession;
}

export function getSessions(): ChatSession[] {
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export function getSession(id: string): ChatSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === id) || null;
}

export function getSessionsByDataset(datasetId: string): ChatSession[] {
  return getSessions().filter(s => s.datasetId === datasetId);
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  
  // Also delete related messages
  const messages = getMessages().filter(m => m.sessionId !== id);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

export function getCurrentSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
}

export function setCurrentSessionId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, id);
}

// Message operations
export function saveMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  const messages = getMessages();
  const newMessage: ChatMessage = {
    ...message,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  messages.push(newMessage);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  return newMessage;
}

export function getMessages(): ChatMessage[] {
  const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return data ? JSON.parse(data) : [];
}

export function getMessagesBySession(sessionId: string): ChatMessage[] {
  return getMessages().filter(m => m.sessionId === sessionId);
}

export function deleteMessage(id: string): void {
  const messages = getMessages().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Export/Import data
export function exportData(): string {
  const data = {
    datasets: getDatasets(),
    sessions: getSessions(),
    messages: getMessages(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): void {
  try {
    const data = JSON.parse(jsonString);
    if (data.datasets) {
      localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(data.datasets));
    }
    if (data.sessions) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions));
    }
    if (data.messages) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data.messages));
    }
  } catch (error) {
    throw new Error('Invalid import data format');
  }
}
