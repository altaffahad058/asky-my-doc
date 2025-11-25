// Cohere embedding configuration shared across routes
import { COHERE_API_KEY, COHERE_API_BASE, COHERE_EMBED_MODEL } from './ai';

export const embeddingConfig = {
  model: COHERE_EMBED_MODEL,
  dimensions: 1024, // Cohere embed-english-v3.0 has 1024 dimensions
  apiBase: COHERE_API_BASE,
  hasApiKey: Boolean(COHERE_API_KEY),
  keyPreview: COHERE_API_KEY ? `${COHERE_API_KEY.substring(0, 8)}...` : 'NOT_SET'
};
