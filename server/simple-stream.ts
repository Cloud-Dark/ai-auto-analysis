import { Router } from "express";
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
 * Simplified SSE endpoint for streaming chat responses
 * No authentication, no database - pure AI proxy
 * POST /api/stream
 */
router.post("/", async (req, res) => {
  try {
    const { apiKey, modelName, message, datasetContent, datasetType } = req.body;

    if (!apiKey || !modelName || !message) {
      res.status(400).json({ error: "Missing required fields: apiKey, modelName, message" });
      return;
    }

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

      // Load dataset if provided
      if (datasetContent && datasetType) {
        const tempDir = os.tmpdir();
        const ext = datasetType === 'csv' ? 'csv' : 'xlsx';
        const tempFilePath = path.join(tempDir, `dataset_${Date.now()}.${ext}`);
        
        // Write dataset content to temp file
        await fs.writeFile(tempFilePath, datasetContent, 'utf-8');
        
        const loadResult = await loadDataset(tempFilePath);
        if (!loadResult.success) {
          res.write(`data: ${JSON.stringify({ type: "error", message: loadResult.error })}\n\n`);
          res.end();
          return;
        }

        // Clean up temp file after loading
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {
          console.error("Failed to delete temp file:", e);
        }
      }

      // Create AI agent
      const { model } = await createAIAgent(apiKey, modelName);

      // Start chat (no history for now, can be added later)
      const chat = model.startChat({
        history: [],
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
