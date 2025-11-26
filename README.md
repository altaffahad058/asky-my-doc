# AskMyDocs

AskMyDocs is an end-to-end AI assistant for your personal knowledge base. Users can sign up, upload their own documents (`.txt`, `.pdf`, `.docx`), and ask grounded questions. Documents are chunked, embedded with Cohere, indexed inside Pinecone, and queried through a Next.js chat interface that always scopes answers to the user’s content.

## Highlights

- 🔐 **Full-stack auth** – email/password signup, login, logout, password reset, and signed session cookies (`src/app/api/auth/*`, `src/lib/auth.ts`).
- 📂 **Document ingestion pipeline** – server-side parsing (PDF, DOCX, TXT), LangChain chunking, Prisma persistence, Cohere embeddings, Pinecone vector storage (`src/app/api/upload/route.ts`, `src/lib/embeddings.ts`, `src/lib/pinecone.ts`).
- 💬 **Contextual chat workspace** – the chat route performs scoped Pinecone searches before calling Cohere; the UI enforces document selection and surfaces context usage (`src/app/api/chat/route.ts`, `src/hooks/useChat.ts`, `src/components/home/ChatPane.tsx`).
- 🌐 **Optional web references** – one-click summaries feed Tavily web search to surface related public articles alongside the chat (`src/app/api/documents/[id]/references/route.ts`, `src/lib/summaries.ts`, `src/lib/references.ts`).
- 🗂️ **Document dashboard** – `/api/documents` returns user uploads with chunk counts, powering the sidebar picker and upload refresh (`src/app/api/documents/route.ts`, `src/hooks/useDocuments.ts`, `src/components/home/DocumentList.tsx`).
- 🧱 **Typed data layer** – Prisma schema for `User` (first/last/occupation fields), `Document`, and `Chunk`, with migrations under `prisma/migrations`.
- 💅 **Modern UI** – Next.js App Router, React 19, Tailwind CSS 4, and a single-page chat/workspace experience in `src/components/HomeClient.tsx`.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js API routes, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Vector Store**: Pinecone (cosine similarity, 1,024 dimensions)
- **AI**: Cohere (Command R for chat, Embed v3 for embeddings)
- **Retrieval tooling**: LangChain text splitters + Pinecone store helpers
- **Auth**: Signed JWT cookie sessions (`AUTH_SECRET`)
- **File processing**: `pdf-parse`, `mammoth`, Node streams

## Architecture Overview

```
Browser (HomeClient)
   ├─ Auth pages: (auth)/login, signup, forgot-password
   ├─ Document list sidebar ← /api/documents
   ├─ Upload form → /api/upload
   ├─ Chat composer (requires selected document) → /api/chat
   └─ “Get references” button → /api/documents/[id]/references

/api/upload
   1. Verify session via getSessionUserId()
   2. Parse file, extract text, chunk with RecursiveCharacterTextSplitter
   3. Persist Document + Chunks in PostgreSQL (Prisma transaction)
   4. Generate embeddings (Cohere) + upsert into Pinecone namespace user-{id}

/api/chat
   1. Verify session
   2. Validate payload & optional document filter
   3. Embed user query with Cohere
   4. Top-K similarity search (PineconeStore) scoped to the user/optional document
   5. Assemble contextual system prompt
   6. Call Cohere Chat → return grounded answer + context metadata

/api/documents
   - Returns the user’s uploads with chunk counts for UI selection/state.

/api/documents/[id]/references
   1. Verify session + document ownership
   2. Summarize the document into a single searchable sentence (Cohere)
   3. Call Tavily Search with the summary (or custom query)
   4. Return formatted references to the chat UI
```

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database
- Pinecone account + index (dim: 1024, metric: cosine)
- Cohere API key
- Tavily API key

### 2. Configure environment

Create `.env.local` with:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/askmydocs?schema=public"
AUTH_SECRET="generate-a-long-random-string"

COHERE_API_KEY="co_..."
COHERE_API_BASE="https://api.cohere.ai/v1"
COHERE_CHAT_MODEL="command-a-03-2025"
COHERE_EMBED_MODEL="embed-english-v3.0"

PINECONE_API_KEY="pc_..."
PINECONE_INDEX_NAME="ask-my-docs-embeddings"

TAVILY_API_KEY="tvly_..."
```

## 3. Document Ingestion Details

- **Uploads**: handled by `/api/upload` (Node runtime). Files larger than 5 MB or unsupported types (`.txt`, `.pdf`, `.docx`) are rejected before parsing begins.
- **Parsing**: `pdf-parse` for PDF, `mammoth` for DOCX, UTF-8 decoding for TXT. Failures surface descriptive hints (`error` + `hint` fields) in the JSON response.
- **Chunking**: LangChain `RecursiveCharacterTextSplitter` (1,000 chars, 200 overlap) trims each chunk and drops anything under 100 characters to keep embeddings high-signal.
- **Storage**: Documents + plain-text chunks live in PostgreSQL; embeddings live only in Pinecone under namespace `user-{userId}`, referencing `chunkId`.
- **Resilience**: if embedding generation fails, the API warns the caller but keeps the document/chunks so you can retry vectorization later.

## 4. Chat Retrieval Flow

1. `useChat` enforces document selection and posts `{ message, documentId }` to `/api/chat`.
2. Route ensures the user session exists (cookie JWT) and validates the payload.
3. `CohereEmbeddings` generates the query vector; `PineconeStore.fromExistingIndex` searches namespace `user-{id}` (optionally filtered to the provided `documentId`).
4. Up to 3 top chunks (with file metadata + scores) are stitched into a contextual system prompt; missing context yields a fallback helper prompt.
5. `chatRequest()` calls Cohere Chat with the prompt and returns `{ reply, contextUsed, sourcesCount }`.
6. The UI appends 📚 / ℹ️ badges that explain whether document context powered the answer.

## 5. Web Reference Fetching

When users click **Get references** in the chat pane, the app fetches publicly available articles that resemble the selected document:

1. `useChat.fetchReferences()` verifies a document is selected and appends a placeholder assistant message (“Summarizing and fetching references…”).
2. The API route `/api/documents/[id]/references` checks ownership, then:
   - Summarizes the document into a single search-ready sentence using Cohere.
   - Calls the Tavily Search API with that summary (or a custom query if supplied) to retrieve up to 5 links.
   - Returns the summary plus normalized references (title, snippet, url, source host).
3. The placeholder chat message is replaced with a compact list:
   - `📝 Search summary` blockquote describing the document.
   - Numbered references (title + host, single-line snippet, link arrow).

### 6. Configuration & Costs

- Requires `TAVILY_API_KEY` in `.env.local`. The free plan (5k requests/month) is usually enough for personal projects.
- No external data flows into the main RAG pipeline; references are purely informational chat messages so users can open links manually.

## 7. API Surface

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | Create account + session cookie (bcrypt + Prisma). |
| `/api/auth/login` | POST | Email/password login and session creation. |
| `/api/auth/logout` | POST | Clears session cookie. |
| `/api/auth/forgot-password` | POST | Two-step reset (email existence check, then password update). |
| `/api/documents` | GET | List the user’s uploaded documents + chunk totals. |
| `/api/upload` | POST (multipart) | Parse, chunk, embed, and persist a document. |
| `/api/chat` | POST | Contextual chat grounded in the selected document. |
| `/api/documents/[id]/references` | POST | Summarize the document, query Tavily, and return web references (opt-in). |