import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { getChatSession, getSessionMessages, createChatMessage, getDatasetById } from "./db";
import { sdk } from "./_core/sdk";
import fetch from "node-fetch";
import fs from "fs/promises";
import os from "os";

const router = Router();

/**
 * SSE endpoint for streaming chat responses
 * POST /api/chat/stream
 */
router.post("/stream", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ error: "Missing sessionId or message" });
      return;
    }

    // Verify user session
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get chat session
    const chatSession = await getChatSession(sessionId);
    if (!chatSession || chatSession.userId !== user.id) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Get dataset
    const dataset = await getDatasetById(chatSession.datasetId);
    if (!dataset) {
      res.status(404).json({ error: "Dataset not found" });
      return;
    }

    // Download dataset file to temp location
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `dataset_${dataset.id}_${Date.now()}.${dataset.originalFilename.split('.').pop()}`);
    
    const response = await fetch(dataset.fileUrl);
    const buffer = await response.buffer();
    await fs.writeFile(tempFilePath, buffer);

    // Get chat history
    const history = await getSessionMessages(sessionId);
    const chatHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";
    let toolCalls: any[] = [];

    // Spawn Python process for AI analysis
    const pythonScript = path.join(__dirname, "ai_tools.py");
    const pythonProcess = spawn("python3.11", [
      pythonScript,
      "chat",
      chatSession.geminiApiKey,
      message,
      tempFilePath, // Pass dataset path as argument
    ]);

    // Stream Python output
    pythonProcess.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          
          if (parsed.type === "content") {
            fullResponse += parsed.data;
            res.write(`data: ${JSON.stringify({ type: "content", data: parsed.data })}\n\n`);
          } else if (parsed.type === "tool_call") {
            toolCalls.push(parsed);
            res.write(`data: ${JSON.stringify({ type: "tool_call", data: parsed })}\n\n`);
          } else if (parsed.type === "error") {
            res.write(`data: ${JSON.stringify({ type: "error", message: parsed.message })}\n\n`);
          }
        } catch (e) {
          // Not JSON, might be regular output
          console.log("Python output:", line);
        }
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("Python error:", data.toString());
    });

    pythonProcess.on("close", async (code) => {
      // Save assistant response
      await createChatMessage({
        sessionId,
        role: "assistant",
        content: fullResponse || "Analysis completed.",
        metadata: toolCalls.length > 0 ? JSON.stringify({ toolCalls }) : null,
      });

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      pythonProcess.kill();
    });

  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
