# AI Provider Setup

BookmarX uses the Vercel AI SDK for embeddings and AI answers.

## Default Environment

```env
AI_PROVIDER=vercel
AI_API_KEY=
EMBEDDING_MODEL=openai/text-embedding-3-small
CHAT_MODEL=openai/gpt-4o-mini
```

The backend maps `AI_API_KEY` to `AI_GATEWAY_API_KEY` when using AI SDK model strings.

## Embeddings

Embeddings are generated after bookmark sync by the worker.

The initial schema stores `1536`-dimension vectors, matching `openai/text-embedding-3-small`. If you change to a model with different dimensions, update the `bookmark_embeddings.embedding` schema and migration first.

## AI Answers

The `/ai/chat` route:

- Embeds the question
- Retrieves matching bookmark chunks from Postgres `pgvector`
- Generates an answer using only retrieved context
- Returns source citations for the frontend

## Local Models

Local Ollama support is planned but not implemented yet. The current implementation expects an AI SDK-compatible hosted model configuration.
