// Pinecone vector database integration
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ask-my-docs-embeddings';

export interface VectorMetadata {
  chunkId: number;
  documentId: number;
  userId: number;
  text: string;
  chunkLength: number;
}

export interface SearchResult {
  chunkId: number;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Get the Pinecone index
 */
function getIndex() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  return pinecone.index(INDEX_NAME);
}

/**
 * Store a single embedding in Pinecone
 */
export async function storeEmbedding(
  chunkId: number,
  embedding: number[],
  metadata: VectorMetadata
): Promise<void> {
  const index = getIndex();
  
  await index.upsert([
    {
      id: `chunk_${chunkId}`,
      values: embedding,
      metadata: {
        chunkId: metadata.chunkId,
        documentId: metadata.documentId,
        userId: metadata.userId,
        text: metadata.text.substring(0, 1000), // Limit metadata text size
        chunkLength: metadata.chunkLength,
      },
    },
  ]);
}

/**
 * Store multiple embeddings in Pinecone
 */
export async function storeEmbeddings(
  embeddings: Array<{
    chunkId: number;
    embedding: number[];
    metadata: VectorMetadata;
  }>
): Promise<void> {
  if (embeddings.length === 0) return;

  const index = getIndex();
  
  // Convert to Pinecone format
  const vectors = embeddings.map(({ chunkId, embedding, metadata }) => ({
    id: `chunk_${chunkId}`,
    values: embedding,
    metadata: {
      chunkId: metadata.chunkId,
      documentId: metadata.documentId,
      userId: metadata.userId,
      text: metadata.text.substring(0, 1000), // Limit metadata text size
      chunkLength: metadata.chunkLength,
    },
  }));

  // Upsert in batches (Pinecone has a 100 vector limit per request)
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

/**
 * Search for similar embeddings
 */
export async function searchSimilar(
  queryEmbedding: number[],
  options: {
    topK?: number;
    userId?: number;
    documentId?: number;
  } = {}
): Promise<SearchResult[]> {
  const { topK = 5, userId, documentId } = options;
  const index = getIndex();

  // Build filter for user/document scoping
  const filter: Record<string, any> = {};
  if (userId) filter.userId = userId;
  if (documentId) filter.documentId = documentId;

  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return queryResponse.matches?.map(match => ({
    chunkId: (match.metadata as any)?.chunkId,
    score: match.score || 0,
    metadata: match.metadata as any,
  })) || [];
}

/**
 * Delete embeddings for a document
 */
export async function deleteDocumentEmbeddings(documentId: number): Promise<void> {
  const index = getIndex();
  
  // Note: This requires fetching all vectors first, which might be expensive
  // For production, consider using Pinecone namespaces for better organization
  const vectors = await index.query({
    vector: new Array(1024).fill(0), // Dummy vector (1024 dimensions for Cohere)
    topK: 10000, // Large number to get all vectors
    includeMetadata: true,
    filter: { documentId },
  });

  if (vectors.matches && vectors.matches.length > 0) {
    const idsToDelete = vectors.matches.map(match => match.id!);
    await index.deleteMany(idsToDelete);
  }
}

/**
 * Get index stats
 */
export async function getIndexStats() {
  const index = getIndex();
  return await index.describeIndexStats();
}

// Export configuration for debugging
export const pineconeConfig = {
  indexName: INDEX_NAME,
  hasApiKey: Boolean(process.env.PINECONE_API_KEY),
  keyPreview: process.env.PINECONE_API_KEY 
    ? `${process.env.PINECONE_API_KEY.substring(0, 8)}...` 
    : 'NOT_SET'
};
