import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
if (!fsSync.existsSync(DATA_DIR)) {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
}

// Types
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

export interface VectorEntry {
  id: string;
  dataset_id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
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

interface Database {
  datasets: Dataset[];
  sessions: ChatSession[];
  messages: ChatMessage[];
  vectors: VectorEntry[];
  analysis: AnalysisResult[];
}

// File paths
const DB_FILE = path.join(DATA_DIR, "database.json");
const BACKUP_FILE = path.join(DATA_DIR, "database.backup.json");

// In-memory cache
let db: Database = {
  datasets: [],
  sessions: [],
  messages: [],
  vectors: [],
  analysis: [],
};

// Load database from disk
async function loadDatabase() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    db = JSON.parse(data);
    console.log("[JSON-DB] Database loaded from:", DB_FILE);
  } catch (error) {
    // File doesn't exist, start with empty database
    console.log("[JSON-DB] Starting with empty database");
    await saveDatabase();
  }
}

// Save database to disk
async function saveDatabase() {
  try {
    // Create backup
    if (fsSync.existsSync(DB_FILE)) {
      await fs.copyFile(DB_FILE, BACKUP_FILE);
    }
    
    // Save current state
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("[JSON-DB] Failed to save database:", error);
  }
}

// Initialize on module load
loadDatabase();

// Auto-save every 5 seconds
setInterval(saveDatabase, 5000);

// Helper to generate IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== DATASETS ====================

export function createDataset(dataset: Omit<Dataset, "id" | "uploaded_at">): Dataset {
  const newDataset: Dataset = {
    id: generateId(),
    ...dataset,
    uploaded_at: new Date().toISOString(),
  };
  
  db.datasets.push(newDataset);
  saveDatabase();
  return newDataset;
}

export function getDatasets(): Dataset[] {
  return [...db.datasets].sort((a, b) => 
    new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );
}

export function getDataset(id: string): Dataset | null {
  return db.datasets.find(d => d.id === id) || null;
}

export function deleteDataset(id: string): void {
  db.datasets = db.datasets.filter(d => d.id !== id);
  // Also delete related sessions, messages, vectors, analysis
  db.sessions = db.sessions.filter(s => s.dataset_id !== id);
  const sessionIds = db.sessions.filter(s => s.dataset_id === id).map(s => s.id);
  db.messages = db.messages.filter(m => !sessionIds.includes(m.session_id));
  db.vectors = db.vectors.filter(v => v.dataset_id !== id);
  db.analysis = db.analysis.filter(a => a.dataset_id !== id);
  saveDatabase();
}

// ==================== SESSIONS ====================

export function createSession(session: Omit<ChatSession, "id" | "created_at">): ChatSession {
  const newSession: ChatSession = {
    id: generateId(),
    ...session,
    created_at: new Date().toISOString(),
  };
  
  db.sessions.push(newSession);
  saveDatabase();
  return newSession;
}

export function getSessions(): ChatSession[] {
  return [...db.sessions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getSession(id: string): ChatSession | null {
  return db.sessions.find(s => s.id === id) || null;
}

export function getSessionsByDataset(datasetId: string): ChatSession[] {
  return db.sessions
    .filter(s => s.dataset_id === datasetId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function deleteSession(id: string): void {
  db.sessions = db.sessions.filter(s => s.id !== id);
  // Also delete related messages
  db.messages = db.messages.filter(m => m.session_id !== id);
  saveDatabase();
}

// ==================== MESSAGES ====================

export function createMessage(message: Omit<ChatMessage, "id" | "created_at">): ChatMessage {
  const newMessage: ChatMessage = {
    id: generateId(),
    ...message,
    created_at: new Date().toISOString(),
  };
  
  db.messages.push(newMessage);
  saveDatabase();
  return newMessage;
}

export function getMessages(): ChatMessage[] {
  return [...db.messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function getMessagesBySession(sessionId: string): ChatMessage[] {
  return db.messages
    .filter(m => m.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function deleteMessage(id: string): void {
  db.messages = db.messages.filter(m => m.id !== id);
  saveDatabase();
}

// ==================== VECTORS ====================

export async function saveVector(vector: VectorEntry): Promise<void> {
  db.vectors.push(vector);
  await saveDatabase();
}

export async function getVectors(): Promise<VectorEntry[]> {
  return [...db.vectors];
}

export async function getVectorsByDataset(datasetId: string): Promise<VectorEntry[]> {
  return db.vectors.filter(v => v.dataset_id === datasetId);
}

export async function deleteVectorsByDataset(datasetId: string): Promise<void> {
  db.vectors = db.vectors.filter(v => v.dataset_id !== datasetId);
  await saveDatabase();
}

// ==================== ANALYSIS ====================

export async function saveAnalysisResult(result: AnalysisResult): Promise<void> {
  db.analysis.push(result);
  await saveDatabase();
}

export async function getAnalysisResults(): Promise<AnalysisResult[]> {
  return [...db.analysis];
}

export async function getAnalysisResultsBySession(sessionId: string): Promise<AnalysisResult[]> {
  return db.analysis.filter(a => a.session_id === sessionId);
}

export async function deleteAnalysisResultsByDataset(datasetId: string): Promise<void> {
  db.analysis = db.analysis.filter(a => a.dataset_id !== datasetId);
  await saveDatabase();
}

// Cleanup
process.on("exit", () => {
  saveDatabase();
});

process.on("SIGINT", () => {
  saveDatabase();
  process.exit(0);
});

console.log("[JSON-DB] Initialized at:", DATA_DIR);
