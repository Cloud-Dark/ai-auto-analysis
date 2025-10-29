import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  datasets, 
  InsertDataset, 
  Dataset,
  chatSessions,
  InsertChatSession,
  ChatSession,
  chatMessages,
  InsertChatMessage,
  ChatMessage
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Dataset queries
export async function createDataset(dataset: InsertDataset): Promise<Dataset> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(datasets).values(dataset);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(datasets).where(eq(datasets.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserDatasets(userId: number): Promise<Dataset[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(datasets).where(eq(datasets.userId, userId)).orderBy(desc(datasets.createdAt));
}

export async function getDatasetById(id: number): Promise<Dataset | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
  return result[0];
}

// Chat session queries
export async function createChatSession(session: InsertChatSession): Promise<ChatSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatSessions).values(session);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(chatSessions).where(eq(chatSessions.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getChatSession(sessionId: number): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  return result[0];
}

export async function getUserChatSessions(userId: number): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
}

// Chat message queries
export async function createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(message);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(chatMessages).where(eq(chatMessages.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getSessionMessages(sessionId: number): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt);
}
