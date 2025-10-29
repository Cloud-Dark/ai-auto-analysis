import { Router } from "express";
import { getChatSession, getSessionMessages, createChatMessage, getDatasetById } from "./db";
import { sdk } from "./_core/sdk";
import fetch from "node-fetch";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { 
  loadDataset, 
  createAIAgent, 
  executeFunctionCall 
} from "./ai-tools";

const router = Router();

/**
 * SSE endpoint for streaming chat responses (TypeScript version)
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

    // Load dataset
    const loadResult = await loadDataset(tempFilePath);
    if (!loadResult.success) {
      res.status(400).json({ error: loadResult.error });
      return;
    }

    // Get chat history
    const history = await getSessionMessages(sessionId);
    const chatHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";
    let toolCalls: any[] = [];

    try {
      // Send initial status
      res.write(`data: ${JSON.stringify({ type: "status", message: "Processing your request..." })}\n\n`);

      // Create AI agent
      const { model } = await createAIAgent(chatSession.geminiApiKey, chatSession.modelName || "gemini-2.0-flash-exp");

      // Start chat
      const chat = model.startChat({
        history: chatHistory,
      });

      // Send message and get response
      const result = await chat.sendMessageStream(message);

      // Process streaming response
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          res.write(`data: ${JSON.stringify({ type: "content", data: chunkText })}\n\n`);
        }

        // Check for function calls
        const functionCalls = chunk.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
            console.log("Function call:", call.name, call.args);
            
            // Execute function
            const functionResult = await executeFunctionCall(call.name, call.args);
            
            toolCalls.push({
              tool: call.name,
              input: call.args,
              output: functionResult,
            });

            res.write(`data: ${JSON.stringify({ 
              type: "tool_call", 
              data: {
                tool: call.name,
                input: call.args,
                output: functionResult,
              }
            })}\n\n`);

            // Send function result back to model
            const functionResponse = await chat.sendMessageStream([{
              functionResponse: {
                name: call.name,
                response: functionResult,
              },
            }]);

            // Stream function response
            for await (const responseChunk of functionResponse.stream) {
              const responseText = responseChunk.text();
              if (responseText) {
                fullResponse += responseText;
                res.write(`data: ${JSON.stringify({ type: "content", data: responseText })}\n\n`);
              }
            }
          }
        }
      }

      // Save assistant response
      if (fullResponse) {
        await createChatMessage({
          sessionId,
          role: "assistant",
          content: fullResponse,
          metadata: toolCalls.length > 0 ? JSON.stringify({ toolCalls }) : null,
        });
      }

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();

    } catch (error: any) {
      console.error("AI error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error("Stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.end();
    }
  }
});

export default router;
