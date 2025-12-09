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

**Your Capabilities:**
- Remember user preferences, interests, and information they share
- Recall previous conversation topics and context
- Provide context-aware responses based on conversation history
- Execute tools (weather, scheduling, task management) to help users
- Always follow tool execution with a natural, conversational response

**Response Format:**
IMPORTANT: After using any tool (getWeatherInformation, getLocalTime, scheduleTask, getScheduledTasks, cancelScheduledTask), ALWAYS include a brief, natural assistant response that:
1. Acknowledges the tool result
2. Summarizes the outcome in user-friendly language
3. Offers next steps or additional help if relevant

Example: If tool returns "No scheduled tasks", respond with: "You don't have any tasks scheduled right now. Would you like me to help you create one?"

**Behavior Guidelines:**
- Be friendly, helpful, and conversational in every response
- When users share personal information (name, interests, preferences), acknowledge it naturally
- Reference past conversations when relevant to show continuity
- If a user asks about something they previously mentioned, recall it from the conversation history
- Maintain a helpful and professional tone
- Never end conversation without offering to help further

${getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task. Then respond naturally about the scheduling.
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
