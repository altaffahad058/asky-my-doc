// Pinecone vector database integration
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client once per server process
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ask-my-docs-embeddings';

export function getPineconeIndex() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  return pinecone.index(INDEX_NAME);
}

export const pineconeConfig = {
  indexName: INDEX_NAME,
  hasApiKey: Boolean(process.env.PINECONE_API_KEY),
  keyPreview: process.env.PINECONE_API_KEY 
    ? `${process.env.PINECONE_API_KEY.substring(0, 8)}...` 
    : 'NOT_SET'
};
