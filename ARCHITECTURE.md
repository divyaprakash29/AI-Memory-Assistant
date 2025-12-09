# AI Memory Assistant - Architecture

## System Overview

The AI Memory Assistant is built using Cloudflare's Agents SDK, a modern framework for creating stateful, intelligent agents that run on Cloudflare's global edge network.

## Component Architecture

```
┌──────────────────────────────────────────┐
│          CLIENT (Browser)                │
│  ┌────────────────────────────────────┐  │
│  │      React Application             │  │
│  │  - Chat UI (app.tsx)               │  │
│  │  - Message Display                  │  │
│  │  - WebSocket Client                │  │
│  │  - State Management                │  │
│  └──────────────┬─────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │ WebSocket Connection
                  ▼
┌──────────────────────────────────────────┐
│    CLOUDFLARE EDGE (Global Network)      │
│  ┌────────────────────────────────────┐  │
│  │  Cloudflare Worker (server.ts)     │  │
│  │  - Request Router                   │  │
│  │  - routeAgentRequest()              │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│                 ▼                         │
│  ┌────────────────────────────────────┐  │
│  │   Durable Object: Chat Agent       │  │
│  │   (AIChatAgent class)              │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Agent Logic                 │  │  │
│  │  │  - onChatMessage()           │  │  │
│  │  │  - Message Processing        │  │  │
│  │  │ - Tool Orchestration         │  │  │
│  │  └──────┬───────────────────────┘  │  │
│  │         │                          │  │
│  │         ├─────────┐                │  │
│  │         │         │                │  │
│  │         ▼         ▼                │  │
│  │  ┌──────────┐ ┌────────────┐      │  │
│  │  │ SQLite   │ │ Workers AI │      │  │
│  │  │ Storage  │ │ Binding    │      │  │
│  │  │          │ │            │      │  │
│  │  │ Messages │ │ Llama 3.3  │      │  │
│  │  │ State    │ │ 70B Model  │      │  │
│  │  └──────────┘ └────────────┘      │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Technology Stack Details

### Frontend Layer

- **React 19**: Modern UI library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and dev server
- **WebSocket**: Real-time bidirectional communication

### Backend Layer (Cloudflare Workers)

- **Cloudflare Workers**: Serverless compute on the edge
- **Agents SDK**: Framework for building stateful AI agents
- **TypeScript**: Type-safe server code
- **Node.js Compatibility**: Workers runtime with Node.js APIs

### State Management (Durable Objects)

- **Durable Objects**: Strongly consistent, stateful micro-servers
- **SQLite**: Persistent storage for conversation history
- **Automatic Persistence**: Managed by Agents SDK
- **Global Uniqueness**: Each agent instance has unique ID

### AI Integration

- **Workers AI**: Cloudflare's AI inference platform
- **Llama 3.3 70B**: Meta's latest open-source LLM
- **fp8 Quantization**: Optimized for speed
- **workers-ai-provider**: AI SDK adapter for Workers AI

## Data Flow

### User Message Flow

1. **User Input**
   - User types message in React UI
   - Message sent via WebSocket connection

2. **Worker Routing**
   - Worker receives WebSocket upgrade request
   - `routeAgentRequest()` routes to appropriate Durable Object
   - Durable Object instance created or retrieved

3. **Agent Processing**

   ```typescript
   async onChatMessage(onFinish) {
     // Initialize Workers AI
     const workersai = createWorkersAI({ binding: this.env.AI });
     const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

     // Retrieve conversation history
     const messages = this.messages; // Automatic from AIChatAgent

     // Build context-aware prompt
     const result = streamText({
       system: "System prompt with memory instructions",
       messages: convertToModelMessages(messages),
       model
     });

     // Stream response
     return createUIMessageStreamResponse({ stream });
   }
   ```

4. **AI Inference**
   - Agent sends conversation history + new message to Workers AI
   - Llama 3.3 70B processes with full context
   - Response streams back in real-time

5. **State Persistence**
   - Agent automatically saves messages to SQLite
   - Handled by `AIChatAgent` base class
   - No manual storage code needed

6. **Response Delivery**
   - Streamed response sent via WebSocket
   - React UI updates in real-time
   - User sees message appear word-by-word

## Memory Management

### Conversation Storage

```
SQLite Table: messages
┌────────┬──────────┬──────────┬───────────┐
│   ID   │   Role   │ Content  │ Timestamp │
├────────┼──────────┼──────────┼───────────┤
│ msg_1  │   user   │  "Hi!"   │ 12:00:00  │
│ msg_2  │assistant │ "Hello!" │ 12:00:01  │
│  ...   │   ...    │   ...    │    ...    │
└────────┴──────────┴──────────┴───────────┘
```

### Context Window

- **Full History**: All messages sent to LLM for context
- **Automatic Truncation**: Agents SDK handles token limits
- **Resumable Streams**: SQLite buffers chunks during disconnects

### State Synchronization

- **Real-time Sync**: State changes broadcast to all connections
- **Optimistic Updates**: UI updates before server confirms
- **Conflict Resolution**: Last-write-wins strategy

## Workflow Orchestration

### Tools System

```typescript
// Example: Schedule tool
const scheduleTask = tool({
  description: "Schedule a task",
  parameters: z.object({
    type: z.enum(["scheduled", "delayed", "cron"]),
    when: z.union([z.number(), z.string()]),
    payload: z.string()
  }),
  execute: async ({ type, when, payload }) => {
    // Tool implementation
  }
});
```

### Human-in-the-Loop

- Tools can require confirmation
- UI shows confirmation dialog
- Agent waits for user approval
- Action executes only after confirm

## Scalability

### Edge Distribution

- Workers deploy to 300+ global locations
- Durable Objects migrate to optimal location
- Low latency for users worldwide

### Automatic Scaling

- Durable Objects scale elastically
- No capacity planning needed
- Millions of concurrent agents supported

### Resource Management

- Each agent instance: single-threaded
- WebSocket hibernation: reduces memory
- SQLite: efficient persistent storage

## Security

### Authentication

- Workers support auth middlerware
- Can integrate with Cloudflare Access
- Environment variables for secrets

### Isolation

- Each agent instance: isolated execution
- SQLite: per-instance database
- No cross-tenant data leakage

## Deployment

### Development

```bash
npm start           # Local dev with Vite
npx wrangler dev    # Local dev with Wrangler
```

### Production

```bash
npx wrangler deploy # Deploy to Cloudflare
```

### Zero Configuration

- Assets automatically served from `public/`
- Durable Objects auto-provisioned
- SQLite migrations automatic

## Advantages of This Architecture

1. **Simplicity**: Agents SDK abstracts complexity
2. **Performance**: Edge deployment, low latency
3. **Reliability**: Strong consistency, durable storage
4. **Cost efficiency**: Serverless, pay-per-use
5. **Developer Experience**: Modern frameworks, TypeScript
6. **Production Ready**: Built on battle-tested infrastructure

## Future Enhancements

- **Vector Database**: Add Vectorize for semantic search
- **Multiple Models**: Support for different LLMs
- **Voice Input**: WebRTC integration
- **Analytics**: AI Gateway for observability
- **Authentication**: Cloudflare Access integration
