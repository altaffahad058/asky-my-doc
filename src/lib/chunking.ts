// Text chunking utilities for document processing
export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface ChunkingOptions {
  chunkSize?: number;      // Maximum chunk size in characters
  overlap?: number;        // Overlap between chunks in characters
  minChunkSize?: number;   // Minimum chunk size to avoid tiny chunks
}

/**
 * Split text into overlapping chunks for better search and context retrieval.
 * Uses intelligent boundary detection to break at sentences when possible.
 * 
 * @param text - The text to chunk
 * @param options - Chunking configuration options
 * @returns Array of text chunks with position information
 */
export function chunkText(
  text: string, 
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = 1000,      // ~200-250 tokens for most LLMs
    overlap = 200,         // 20% overlap for context continuity
    minChunkSize = 100     // Avoid tiny chunks
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.trim();
  const chunks: TextChunk[] = [];
  
  let startIndex = 0;
  
  while (startIndex < cleanText.length) {
    let endIndex = Math.min(startIndex + chunkSize, cleanText.length);
    
    // If we're not at the end, try to break at a sentence or paragraph boundary
    if (endIndex < cleanText.length) {
      // Look for sentence endings within the last 200 characters
      const searchStart = Math.max(endIndex - 200, startIndex);
      const substring = cleanText.slice(searchStart, endIndex);
      
      // Try to find the last sentence ending
      const sentenceEndings = /[.!?]\s+/g;
      let lastMatch;
      let match;
      
      while ((match = sentenceEndings.exec(substring)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        endIndex = searchStart + lastMatch.index + lastMatch[0].length;
      } else {
        // If no sentence ending found, try paragraph break
        const lastParagraph = substring.lastIndexOf('\n\n');
        if (lastParagraph > 0) {
          endIndex = searchStart + lastParagraph + 2;
        } else {
          // Last resort: break at last space
          const lastSpace = substring.lastIndexOf(' ');
          if (lastSpace > 0) {
            endIndex = searchStart + lastSpace;
          }
        }
      }
    }
    
    const chunkText = cleanText.slice(startIndex, endIndex).trim();
    
    // Only add chunks that meet minimum size requirement
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex
      });
    }
    
    // Move start index forward, accounting for overlap
    if (endIndex >= cleanText.length) {
      break;
    }
    
    startIndex = Math.max(endIndex - overlap, startIndex + 1);
  }
  
  return chunks;
}

/**
 * Get a preview of how text will be chunked (for debugging)
 */
export function previewChunking(
  text: string, 
  options: ChunkingOptions = {}
): { 
  totalChunks: number; 
  averageChunkSize: number;
  chunks: { preview: string; size: number }[]
} {
  const chunks = chunkText(text, options);
  
  return {
    totalChunks: chunks.length,
    averageChunkSize: chunks.length > 0 
      ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / chunks.length)
      : 0,
    chunks: chunks.map(chunk => ({
      preview: chunk.text.slice(0, 100) + (chunk.text.length > 100 ? '...' : ''),
      size: chunk.text.length
    }))
  };
}
