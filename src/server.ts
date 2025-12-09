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

**MOST IMPORTANT: Answer all general questions directly without tools.** Only use tools when the user explicitly requests a specific service (weather check, scheduling, task management).

**Your Capabilities:**
- Answer general knowledge questions, provide information, and have natural conversations
- Remember user preferences, interests, and information they share
- Recall previous conversation topics and context
- Provide context-aware responses based on conversation history
- Execute optional tools for specific services (weather, scheduling, task management)

**How to Respond:**
1. **For general questions** (e.g., "What is the capital of France?", "How does photosynthesis work?"): Answer directly with your knowledge. Do NOT use tools.
2. **For tool-specific requests** (e.g., "What's the weather in Paris?", "Schedule a meeting"): Use the appropriate tool if available.
3. **After using any tool**: Always include a brief, natural follow-up response summarizing the result and offering next steps.

**Available Tools** (use only when specifically requested):
- getWeatherInformation: Get weather for a city (requires user approval)
- getLocalTime: Get current time in a location
- scheduleTask: Schedule tasks (one-time, delayed, or recurring)
- getScheduledTasks: List all scheduled tasks
- cancelScheduledTask: Cancel a task

**Behavior Guidelines:**
- Be friendly, helpful, and conversational in every response
- When users share personal information (name, interests, preferences), acknowledge it naturally
- Reference past conversations when relevant to show continuity
- Maintain a helpful and professional tone
- Never refuse to answer general questions

${getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool. Otherwise, respond naturally using your knowledge.
`,

          messages: convertToModelMessages(processedMessages),
          model,
          tools: allTools,
          // Type boundary: streamText expects specific tool types, but base class uses ToolSet
          // This is safe because our tools satisfy ToolSet interface (verified by 'satisfies' in tools.ts)
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
