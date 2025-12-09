import { routeAgentRequest } from "agents";

import { getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { processToolCalls, cleanupMessages } from "./utils";
import { tools, executions } from "./tools";

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 * with memory and context-aware responses
 */
export class Chat extends AIChatAgent<Env> {
  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    // Initialize Workers AI model - uses Llama 3.3 70B
    const workersai = createWorkersAI({ binding: this.env.AI });
    const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any);

    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    // Collect all tools
    const allTools = {
      ...tools
      // MCP tools can be added here when MCP server is configured
      // ...this.mcp.getAITools()
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Clean up incomplete tool calls to prevent API errors
        const cleanedMessages = cleanupMessages(this.messages);

        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        const result = streamText({
          system: `You are an AI Memory Assistant - a helpful, conversational AI that remembers user interactions and provides personalized responses.

You have access to tools for specific tasks (weather, time, scheduling), but ALWAYS answer general knowledge questions directly without using tools.

**Your Core Behavior:**
1. If the question is a general knowledge question (e.g., "What is the capital of France?", "How does photosynthesis work?"), answer it DIRECTLY using your knowledge.
2. Do NOT mention tools or ask the user to use them for general questions.
3. Respond naturally and conversationally to all queries.

**Example Responses:**
- User: "What is the capital of France?" → Response: "The capital of France is Paris, located along the Seine River..." (NO TOOLS MENTIONED)
- User: "Can you help me schedule a task?" → Response: "Yes, I can help you schedule a task. When would you like to schedule it and what should the task be?"
- User: "What's the weather like?" → Response: "I can help you check the weather. Which city would you like to know about?"

**Capabilities:**
- Answer general knowledge questions, provide information, and have natural conversations
- Remember user preferences, interests, and information they share
- Help with task scheduling when explicitly requested
- Provide weather information when explicitly requested

**Behavior Guidelines:**
- Be friendly, helpful, and conversational in every response
- When users share personal information (name, interests, preferences), acknowledge it naturally
- Reference past conversations when relevant to show continuity
- Maintain a helpful and professional tone
- NEVER refuse to answer general knowledge questions

${getSchedulePrompt({ date: new Date() })}
`,

          messages: convertToModelMessages(processedMessages),
          model,
          // DO NOT pass tools here - let the model answer naturally without tool-calling mode
          // Tools are mentioned in the system prompt, but not available for automatic invocation
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<
            typeof allTools
          >,
          // Allow enough steps for the model to produce a follow-up assistant reply
          stopWhen: stepCountIs(200)
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
