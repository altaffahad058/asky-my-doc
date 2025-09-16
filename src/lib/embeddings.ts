// Embedding generation using Cohere - leveraging shared config from ai.ts
import { COHERE_API_KEY, COHERE_API_BASE, COHERE_EMBED_MODEL } from './ai';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

/**
 * Generate embedding for a single text chunk using Cohere
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${COHERE_API_BASE}/embed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: COHERE_EMBED_MODEL,
        texts: [text.replace(/\n/g, ' ')], // Replace newlines with spaces
        input_type: 'search_document', // Optimized for storing documents
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere embed API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embeddings?.[0];
    
    if (!embedding) {
      throw new Error('No embedding returned from Cohere');
    }

    return {
      embedding,
      text,
      tokens: data.meta?.tokens?.total_tokens || 0,
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple text chunks using Cohere
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY environment variable is required');
  }

  if (texts.length === 0) {
    return [];
  }

  try {
    // Cohere can handle larger batches than OpenAI
    const batchSize = 96; // Cohere's max batch size
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await fetch(`${COHERE_API_BASE}/embed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: COHERE_EMBED_MODEL,
          texts: batch.map(text => text.replace(/\n/g, ' ')),
          input_type: 'search_document',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cohere embed API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const embeddings = data.embeddings || [];

      const batchResults = embeddings.map((embedding: number[], index: number) => ({
        embedding,
        text: batch[index],
        tokens: data.meta?.tokens?.total_tokens || 0,
      }));

      results.push(...batchResults);

      // Small delay between batches to be nice to the API
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Generate query embedding (optimized for search queries)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${COHERE_API_BASE}/embed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: COHERE_EMBED_MODEL,
        texts: [query.replace(/\n/g, ' ')],
        input_type: 'search_query', // Optimized for search queries
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere embed API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embeddings?.[0];
    
    if (!embedding) {
      throw new Error('No embedding returned from Cohere');
    }

    return embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

// Export configuration for debugging
export const embeddingConfig = {
  model: COHERE_EMBED_MODEL,
  dimensions: 1024, // Cohere embed-english-v3.0 has 1024 dimensions
  apiBase: COHERE_API_BASE,
  hasApiKey: Boolean(COHERE_API_KEY),
  keyPreview: COHERE_API_KEY ? `${COHERE_API_KEY.substring(0, 8)}...` : 'NOT_SET'
};
