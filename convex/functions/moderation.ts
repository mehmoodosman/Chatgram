import { v } from "convex/values";
import Groq from "groq-sdk";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const run = internalAction({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    // 1. Get the message
    const message = await ctx.runQuery(
      internal.functions.moderation.getMessage,
      {
        id,
      }
    );
    if (!message) {
      return;
    }
    // 2. Use the Groq SDK to send the message to the moderation endpoint
    const result = await groq.chat.completions.create({
      model: "llama-guard-3-8b",
      messages: [
        {
          role: "user",
          content: message.content,
        },
      ],
    });

    const value = result.choices[0].message.content;
    console.log(value);

    // 3. If the message is flagged, we'll delete the message
    if (value?.startsWith("unsafe")) {
      await ctx.runMutation(internal.functions.moderation.deleteMessage, {
        id,
      });
    }
  },
});

export const getMessage = internalQuery({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const deleteMessage = internalMutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
