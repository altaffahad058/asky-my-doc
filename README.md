# AskMyDocs

AskMyDocs is an end-to-end AI assistant for your personal knowledge base. Users can sign up, upload their own documents (`.txt`, `.pdf`, `.docx`), and ask grounded questions. Documents are chunked, embedded with Cohere, indexed inside Pinecone, and queried through a Next.js chat interface that always scopes answers to the user’s content.

## Highlights

- 🔐 **Full-stack auth** – email/password signup, login, logout, password reset, and signed session cookies (`src/app/api/auth/*`, `src/lib/auth.ts`).
- 📂 **Document ingestion pipeline** – server-side parsing (PDF, DOCX, TXT), chunking, Prisma persistence, Cohere embeddings, Pinecone vector storage (`src/app/api/upload/route.ts`, `src/lib/chunking.ts`, `src/lib/embeddings.ts`, `src/lib/pinecone.ts`).
- 💬 **Contextual chat** – every chat call retrieves the most relevant chunks via vector search before hitting Cohere (`src/app/api/chat/route.ts`, `src/lib/ai.ts`).
- 🔎 **Semantic search API** – dedicated `/api/search` endpoint to inspect the top matching passages per query.
- 🧱 **Typed data layer** – Prisma schema for `User`, `Document`, and `Chunk`, with migrations under `prisma/migrations`.
- 💅 **Modern UI** – Next.js App Router, React 19, Tailwind CSS 4, and a single-page chat/workspace experience in `src/components/HomeClient.tsx`.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js API routes, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Vector Store**: Pinecone (cosine similarity, 1,024 dimensions)
- **AI**: Cohere (Command R for chat, Embed v3 for embeddings)
- **Auth**: Signed JWT cookie sessions (`AUTH_SECRET`)
- **File processing**: `pdf-parse`, `mammoth`, Node streams

## Architecture Overview

```
Browser (HomeClient)
   ├─ Auth pages: (auth)/login, signup, forgot-password
   ├─ Upload form → /api/upload (multipart/form-data)
   └─ Chat composer → /api/chat (JSON)

/api/upload
   1. Verify session via getSessionUserId()
   2. Parse file, extract text, chunk (`chunkText`)
   3. Persist Document + Chunks in PostgreSQL (Prisma)
   4. Generate embeddings (Cohere) + upsert into Pinecone

/api/chat
   1. Verify session
   2. Embed user query
   3. Top-K similarity search from Pinecone (user scoped)
   4. Pull chunk metadata from PostgreSQL
   5. Assemble contextual system prompt
   6. Call Cohere Chat → return grounded answer

/api/search
   - Same retrieval pipeline as chat, but returns structured matches for UI debugging/inspection.
```

## Getting Started

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database
- Pinecone account + index (dim: 1024, metric: cosine)
- Cohere API key

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create `.env.local` (or populate your deployment secrets):

```bash
# Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/askmydocs?schema=public"
AUTH_SECRET="generate-a-long-random-string"

COHERE_API_KEY="co_..."
COHERE_API_BASE="https://api.cohere.ai/v1"            # optional override
COHERE_CHAT_MODEL="command-a-03-2025"                 # optional override
COHERE_EMBED_MODEL="embed-english-v3.0"               # optional override

PINECONE_API_KEY="pc_..."
PINECONE_INDEX_NAME="ask-my-docs-embeddings"

# Optional tuning
NODE_ENV="development"
```

> **Tips**
> - `AUTH_SECRET` must be at least 32 random bytes (use `openssl rand -base64 32`).
> - Pinecone index must already exist with 1,024 dimensions to match Cohere’s embeddings.

### 4. Initialize the database

```bash
npx prisma migrate dev
npx prisma generate        # generally run automatically by migrate
# Optional: inspect data
npx prisma studio
```

### 5. Run the app

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to sign up, upload documents, and start chatting.

## Document Ingestion Details

- **Uploads**: handled by `/api/upload` (Node runtime). Files >5 MB or unsupported types are rejected.
- **Parsing**: `pdf-parse` for PDF, `mammoth` for DOCX, UTF-8 decoding for TXT.
- **Chunking**: default 1,000 characters with 200-character overlap (see `chunkText`).
- **Storage**: raw document text + chunks live in PostgreSQL; embeddings live only in Pinecone keyed by `chunk_{id}`.
- **Resilience**: if embedding generation fails, the API returns a warning but still keeps the document/chunks so you can retry later.

## Chat + Search Flow

1. `HomeClient` posts `{ message }` to `/api/chat`.
2. Route ensures the user session exists (cookie JWT).
3. `generateQueryEmbedding()` calls Cohere Embed with `input_type: search_query`.
4. `searchSimilar()` queries Pinecone filtered by `userId`.
5. Matching `chunkId`s are hydrated from PostgreSQL (with related document metadata).
6. The system prompt is rebuilt to include the best chunks and guardrails (fallbacks if no context is found).
7. `chatRequest()` calls Cohere Chat with the custom system prompt.
8. Response is streamed back to the UI and annotated (“📚 Answer based on N sections…”).

The `/api/search` route exposes the same retrieval mechanics without asking Cohere, which is useful for debugging embeddings and surfacing raw text matches in future UI components.

## API Surface

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | Create account + session cookie (bcrypt + Prisma). |
| `/api/auth/login` | POST | Email/password login and session creation. |
| `/api/auth/logout` | POST | Clears session cookie. |
| `/api/auth/forgot-password` | POST | Two-step reset (email existence check, then password update). |
| `/api/upload` | POST (multipart) | Parse, chunk, embed, and persist a document. |
| `/api/chat` | POST | Contextual chat grounded in user documents. |
| `/api/search` | POST | Retrieve top matching chunks for a query. |

All routes require `getSessionUserId()` unless noted otherwise.

## Useful npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js in development mode. |
| `npm run build` | Create production build. |
| `npm start` | Run built app. |
| `npm run lint` | Run ESLint with the project config. |
| `npm run prisma:migrate` | Apply Prisma migrations (`prisma migrate dev`). |
| `npm run prisma:generate` | Regenerate Prisma client. |
| `npm run prisma:reset` | Reset DB (`prisma migrate reset`). |
| `npm run prisma:studio` | Open Prisma Studio. |

## Deployment Notes

- **Vercel**: Works well with Next.js App Router. Keep `/api/upload` on the Node.js runtime (already forced via `export const runtime = "nodejs"`). Store `.env` secrets in Vercel project settings.
- **Background jobs**: Large documents may take a few seconds while embeddings are generated. Consider queueing + background processing if you need higher throughput.
- **Security**: All sensitive values (DB URL, API keys) must be server-side only. Do not expose them via `NEXT_PUBLIC_*`.
- **Pinecone limits**: Upsertion is batched by 100 vectors per request. Adjust `batchSize` if Pinecone limits change.

## Troubleshooting

- **“AI API key not configured”** – ensure `COHERE_API_KEY` is set before calling `/api/chat` or `/api/upload`.
- **“Pinecone not configured”** – check both `PINECONE_API_KEY` and `PINECONE_INDEX_NAME`.
- **Embeddings fail after upload** – verify the Pinecone index dimension (1024) and region match your environment settings.
- **Auth SECRET errors** – set `AUTH_SECRET` in every environment (dev/prod). Tokens are invalidated if the secret changes.
- **File parsing issues** – the upload API returns detailed hints (e.g., min 50 characters, 5 MB cap). Log output in the server console is useful for debugging.

## Next Steps & Ideas

- Persist and paginate chat history per user/document pairing.
- Add UI for browsing uploaded documents and manual semantic search results.
- Support additional file types (HTML, Markdown) or external data connectors.
- Add background re-embedding jobs when models are updated.
- Integrate email delivery for password resets instead of the current two-step API.
