import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  createDataset,
  getDatasets,
  getDataset,
  deleteDataset as deleteDatasetDB,
  createSession,
  getSessions,
  getSession,
  getSessionsByDataset,
  deleteSession as deleteSessionDB,
  createMessage,
  getMessages,
  getMessagesBySession,
  deleteMessage as deleteMessageDB,
  saveAnalysisResult,
  getAnalysisResultsBySession,
  deleteAnalysisResultsByDataset,
  deleteVectorsByDataset,
} from "./json-db";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), "data", "uploads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "data", "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// ==================== DATASETS ====================

// GET /api/datasets - List all datasets
router.get("/datasets", (req, res) => {
  try {
    const datasets = getDatasets();
    res.json({ success: true, data: datasets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/datasets/:id - Get single dataset
router.get("/datasets/:id", (req, res) => {
  try {
    const dataset = getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ success: false, error: "Dataset not found" });
    }
    res.json({ success: true, data: dataset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/datasets - Upload new dataset
router.post("/datasets", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const dataset = createDataset({
      name: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype.includes("csv") ? "csv" : "xlsx",
      size: req.file.size,
    });

    res.json({ success: true, data: dataset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/datasets/:id - Delete dataset
router.delete("/datasets/:id", async (req, res) => {
  try {
    const dataset = getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ success: false, error: "Dataset not found" });
    }

    // Delete file
    try {
      await fs.unlink(dataset.file_path);
    } catch (e) {
      console.error("Failed to delete file:", e);
    }

    // Delete from database
    deleteDatasetDB(req.params.id);

    // Delete related vectors and analysis
    await deleteVectorsByDataset(req.params.id);
    await deleteAnalysisResultsByDataset(req.params.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SESSIONS ====================

// GET /api/sessions - List all sessions
router.get("/sessions", (req, res) => {
  try {
    const sessions = getSessions();
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sessions/:id - Get single session
router.get("/sessions/:id", (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }
    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/datasets/:id/sessions - Get sessions for a dataset
router.get("/datasets/:id/sessions", (req, res) => {
  try {
    const sessions = getSessionsByDataset(req.params.id);
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sessions - Create new session
router.post("/sessions", (req, res) => {
  try {
    const { dataset_id, gemini_api_key, model_name, title } = req.body;

    if (!dataset_id || !gemini_api_key || !model_name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: dataset_id, gemini_api_key, model_name",
      });
    }

    const session = createSession({
      dataset_id,
      gemini_api_key,
      model_name,
      title: title || "New Chat Session",
    });

    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete("/sessions/:id", (req, res) => {
  try {
    deleteSessionDB(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MESSAGES ====================

// GET /api/messages - List all messages
router.get("/messages", (req, res) => {
  try {
    const messages = getMessages();
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sessions/:id/messages - Get messages for a session
router.get("/sessions/:id/messages", (req, res) => {
  try {
    const messages = getMessagesBySession(req.params.id);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages - Create new message
router.post("/messages", (req, res) => {
  try {
    const { session_id, role, content, metadata } = req.body;

    if (!session_id || !role || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: session_id, role, content",
      });
    }

    const message = createMessage({
      session_id,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete("/messages/:id", (req, res) => {
  try {
    deleteMessageDB(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANALYSIS ====================

// GET /api/sessions/:id/analysis - Get analysis results for a session
router.get("/sessions/:id/analysis", async (req, res) => {
  try {
    const results = await getAnalysisResultsBySession(req.params.id);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/analysis - Save analysis result
router.post("/analysis", async (req, res) => {
  try {
    const { dataset_id, session_id, analysis_type, result } = req.body;

    if (!dataset_id || !session_id || !analysis_type || !result) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: dataset_id, session_id, analysis_type, result",
      });
    }

    await saveAnalysisResult({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataset_id,
      session_id,
      analysis_type,
      result,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
