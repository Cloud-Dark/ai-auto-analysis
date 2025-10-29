import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createDataset, 
  getUserDatasets, 
  getDatasetById,
  createChatSession,
  getChatSession,
  getUserChatSessions,
  createChatMessage,
  getSessionMessages
} from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dataset: router({
    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        content: z.string(), // base64 encoded file content
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Decode base64 content
          const buffer = Buffer.from(input.content, 'base64');
          
          // Generate unique file key
          const randomSuffix = randomBytes(8).toString('hex');
          const ext = input.filename.split('.').pop();
          const fileKey = `datasets/${ctx.user.id}/${randomSuffix}.${ext}`;
          
          // Upload to S3
          const { url } = await storagePut(fileKey, buffer, input.mimeType);
          
          // Save dataset metadata to database
          const dataset = await createDataset({
            userId: ctx.user.id,
            name: input.filename.replace(/\.[^/.]+$/, ""), // Remove extension
            originalFilename: input.filename,
            fileKey,
            fileUrl: url,
            mimeType: input.mimeType,
            fileSize: buffer.length,
            columns: null,
            rowCount: null,
          });
          
          return dataset;
        } catch (error) {
          console.error("Dataset upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to upload dataset",
          });
        }
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserDatasets(ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const dataset = await getDatasetById(input.id);
        if (!dataset || dataset.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dataset not found",
          });
        }
        return dataset;
      }),
  }),

  chat: router({
    createSession: protectedProcedure
      .input(z.object({
        datasetId: z.number(),
        geminiApiKey: z.string(),
        title: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify dataset belongs to user
        const dataset = await getDatasetById(input.datasetId);
        if (!dataset || dataset.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dataset not found",
          });
        }

        const session = await createChatSession({
          userId: ctx.user.id,
          datasetId: input.datasetId,
          geminiApiKey: input.geminiApiKey,
          title: input.title || `Analysis of ${dataset.name}`,
        });

        return session;
      }),

    listSessions: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserChatSessions(ctx.user.id);
      }),

    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getChatSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        return session;
      }),

    getMessages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getChatSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        return getSessionMessages(input.sessionId);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getChatSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }

        // Save user message
        await createChatMessage({
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
          metadata: null,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
