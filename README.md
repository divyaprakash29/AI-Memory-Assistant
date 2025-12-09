# 🤖 AI Memory Assistant

**Live Demo:** [Coming after deployment]

An intelligent conversational AI assistant built with **Cloudflare's Agents SDK** that remembers user conversations, preferences, and context across sessions. Powered by Llama 3.3 70B via Workers AI.

![Cloudflare AI Assignment](https://img.shields.io/badge/Cloudflare-AI_Assignment-orange?style=for-the-badge&logo=cloudflare)

## 🎯 Project Overview

This project demonstrates a complete AI-powered application built on Cloudflare's infrastructure, meeting all assignment requirements:

- ✅ **LLM Integration**: Llama 3.3 70B via Cloudflare Workers AI
- ✅ **Workflow/Coordination**: Cloudflare Durable Objects with Agents SDK
- ✅ **User Input**: Real-time chat interface with WebSocket streaming
- ✅ **Memory/State**: Persistent conversation history and user preferences via SQLite

## ✨ Features

### Core Capabilities

- 💬 **Real-time Chat**: Interactive conversation interface with streaming responses
- 🧠 **Conversation Memory**: Remembers previous messages and context across sessions
- 👤 **User Preferences**: Tracks and recalls user information (name, interests, preferences)
- ⚡ **WebSocket Streaming**: Real-time message delivery with auto-resume on disconnect
- 📅 **Task Scheduling**: One-time, delayed, and recurring task management
- 🌓 **Theme Support**: Dark/light mode toggle
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Technical Features

- **Cloudflare Agents SDK**: Modern framework for stateful AI agents
- **Automatic State Persistence**: SQLite storage managed by Durable Objects
- **Resumable Streams**: Conversations survive network disconnects
- **Tool Integration**: Extensible tool system with human-in-the-loop confirmation
- **Type-Safe**: Full TypeScript implementation

## 🏗️ Architecture

```
┌─────────────────┐
│   User Browser  │
│   (React UI)    │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Worker          │
└────────┬────────┘
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
┌──────────┐ ┌─────────────┐
│ Durable  │ │ Workers AI  │
│ Object   │ │ (Llama 3.3) │
│ (Agent)  │ └─────────────┘
└──────────┘
   │
   ▼
┌──────────┐
│  SQLite  │
│ (Memory) │
└──────────┘
```

**Flow:**

1. User sends message via React UI → WebSocket connection
2. Worker routes request to Durable Object (Agent instance)
3. Agent retrieves conversation history from SQLite
4. Agent sends context + new message to Workers AI (Llama 3.3)
5. AI response streams back through WebSocket
6. Agent saves updated conversation to SQLite

## 🛠️ Technology Stack

| Component            | Technology                 | Purpose                        |
| -------------------- | -------------------------- | ------------------------------ |
| **AI Model**         | Llama 3.3 70B (Workers AI) | Natural language understanding |
| **Framework**        | Cloudflare Agents SDK      | AI agent orchestration         |
| **State Management** | Durable Objects + SQLite   | Persistent memory              |
| **Frontend**         | React + TypeScript         | User interface                 |
| **Styling**          | Tailwind CSS               | Modern UI design               |
| **Real-time**        | WebSockets                 | Streaming responses            |
| **Development**      | Vite                       | Fast build tool                |
| **Deployment**       | Cloudflare Workers         | Edge computing                 |

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Cloudflare account** ([Sign up here](https://dash.cloudflare.com/sign-up))
- **Git** (for cloning the repository)

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/cf-ai-memory-assistant.git
   cd cf-ai-memory-assistant
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run with Wrangler (recommended):**

   ```bash
   npx wrangler dev
   ```

   The app will be available at the URL shown in the terminal (typically `http://localhost:8787`)

   _Note: First run requires Cloudflare authentication_

4. **Test the assistant:**
   - Open your browser to the provided URL
   - Start chatting! Try:
     - "Hello! My name is Alex."
     - "What's my name?" (It should remember!)
     - "I'm interested in learning about AI"
     - Later: "What are my interests?"

### Deployment to Cloudflare

1. **Login to Cloudflare:**

   ```bash
   npx wrangler login
   ```

2. **Deploy:**

   ```bash
   npm run deploy
   ```

3. **Access your deployed app:**
   - Wrangler will output the deployment URL
   - Example: `https://cf-ai-memory-assistant.YOUR_SUBDOMAIN.workers.dev`

## 💡 Usage Examples

### Basic Conversation

```
You: Hello! My name is Nitesh.
AI: Hi Nitesh! It's nice to meet you. How can I help you today?

You: I'm interested in learning about machine learning.
AI: That's great, Nitesh! Machine learning is a fascinating field...

[Later, in a new session]

You: What's my name?
AI: Your name is Nitesh!

You: What am I interested in?
AI: You mentioned you're interested in learning about machine learning!
```

### Task Scheduling

```
You: Remind me to review my code in 1 hour
AI: I'll set up a delayed task to remind you in 1 hour.

You: Schedule a daily standup at 9 AM
AI: I'll schedule a recurring task using cron pattern for 9 AM daily.
```

## 📁 Project Structure

```
cf-ai-memory-assistant/
├── src/
│   ├── app.tsx              # React UI implementation
│   ├── server.ts            # AI Agent with Llama 3.3 integration
│   ├── tools.ts             # Tool definitions (scheduling, etc.)
│   ├── utils.ts             # Helper functions
│   └── styles.css           # UI styling
├── public/                  # Static assets
├── wrangler.jsonc           # Cloudflare configuration
├── package.json             # Dependencies
├── README.md                # This file
├── PROMPTS.md               # AI prompts used for development
└── ARCHITECTURE.md          # Detailed technical architecture
```

## 🔧 Customization

### Modify the AI Personality

Edit the system prompt in `src/server.ts`:

```typescript
system: `You are an AI Memory Assistant - a helpful, conversational AI...`;
```

### Add New Tools

Add tools in `src/tools.ts`:

```typescript
const myNewTool = tool({
  description: "Description of what the tool does",
  parameters: z.object({
    param: z.string()
  }),
  execute: async ({ param }) => {
    // Tool implementation
  }
});
```

### Change UI Theme

Modify colors in `src/styles.css` or update Tailwind configuration.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Send a message and receive AI response
- [ ] Share personal information and verify AI remembers it
- [ ] Refresh the page and confirm conversation persists
- [ ] Test on mobile device
- [ ] Try task scheduling features
- [ ] Test theme toggle

## 🐛 Troubleshooting

**Issue: "Worker not found" error**

- Ensure you're running `npm start` for local development
- For deployment, run `npx wrangler deploy`

**Issue: AI not responding**

- Check that Workers AI binding is configured in `wrangler.jsonc`
- Verify you're connected to the internet

**Issue: Conversation history not persisting**

- SQLite storage is automatic with Durable Objects
- Ensure you're using the same agent instance (same session)

## 📚 Learn More

- [Cloudflare Agents SDK Documentation](https://developers.cloudflare.com/agents/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Llama 3.3 Model Details](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)

## 📝 Assignment Compliance

This project fulfills all Cloudflare AI assignment requirements:

✅ **Repository naming**: `cf-ai-memory-assistant` (starts with `cf_ai_`)  
✅ **README.md**: Comprehensive documentation with running instructions  
✅ **PROMPTS.md**: Complete record of AI prompts used  
✅ **LLM Integration**: Llama 3.3 via Workers AI  
✅ **Workflow/Coordination**: Agents SDK + Durable Objects  
✅ **User Input**: Real-time chat interface  
✅ **Memory/State**: Persistent SQLite storage  
✅ **Original Work**: Developed using Cloudflare's Agents SDK and Workers AI platform

## 📜 License

MIT

## 🙋‍♂️ Author

**Nitesh** - Built for the Cloudflare AI Assignment

### Tech Stack Highlights

- **Cloudflare Agents SDK**: Modern framework for stateful AI agents
- **Workers AI**: Serverless AI inference with Llama 3.3 70B
- **Durable Objects**: Persistent state management with SQLite
- **React + TypeScript**: Type-safe, modern UI development

---

**Status**: Ready for submission ✅
