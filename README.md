# Ask My Docs - AI Chat System

A simple AI chat application built with Next.js and Cohere AI.

## Features

- 🤖 **AI Chat**: Chat with Cohere's AI assistant
- 🆓 **Free API**: Uses Cohere's free tier (1000 calls/month)
- 🚀 **Simple Setup**: Just one API key needed

## Quick Setup

### 1. Get Cohere API Key
- Visit: https://dashboard.cohere.com/
- Sign up for free account
- Go to "API Keys" section
- Create new API key (starts with `co_`)

### 2. Environment Variables
Create `.env.local` file and add:

```bash
# Database
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-here"

# Cohere AI
COHERE_API_KEY="co_your_actual_api_key_here"
```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Setup database
npm run prisma:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts     # Chat API endpoint
│   └── ...
├── lib/
│   └── ai.ts                 # Cohere AI integration
└── components/
    └── HomeClient.tsx        # Chat interface
```

## How It Works

1. User types a message in the chat interface
2. Frontend sends message to `/api/chat` endpoint
3. Backend calls Cohere API using `chatRequest()` function
4. AI response is returned and displayed

## Available Functions

```typescript
import { chatRequest } from '@/lib/ai';

// Basic chat
const response = await chatRequest("Hello!");

// With options
const response = await chatRequest("Hello!", {
  maxTokens: 1000,
  temperature: 0.8,
  systemPrompt: "You are a helpful assistant."
});
```

## Learn More

- [Cohere AI Documentation](https://docs.cohere.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## What's Next?

As you build more features, you can add:
- Document upload and processing
- Embeddings for semantic search
- Chat history
- User authentication improvements
- File storage

---

*This is a learning project - perfect for exploring AI chat integration!* 🎉