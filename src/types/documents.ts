export type DocumentSummary = {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  chunkCount: number;
};

export type WebReference = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  fetchedAt: string;
  score?: number;
};

