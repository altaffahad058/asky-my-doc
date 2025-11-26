import { WebReference } from "@/types/documents";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
const TAVILY_ENDPOINT = "https://api.tavily.com/search";

type FetchReferencesArgs = {
  query: string;
  limit?: number;
};

export async function fetchWebReferences({
  query,
  limit = 5,
}: FetchReferencesArgs): Promise<WebReference[]> {
  if (!TAVILY_API_KEY) {
    throw new Error(
      "TAVILY_API_KEY is not configured. Set it in your environment to enable web references."
    );
  }

  const response = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: Math.min(Math.max(limit, 1), 8),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `Web reference search failed (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      snippet?: string;
      published_date?: string;
      score?: number;
    }>;
  };

  const results = Array.isArray(data?.results) ? data.results : [];
  const fetchedAt = new Date().toISOString();

  return results.slice(0, limit).map((item) => {
    const url = item.url ?? "";
    return {
      title: item.title?.trim() || url || "Untitled",
      url,
      snippet: (item.content || item.snippet || "").trim(),
      source: extractHostname(url),
      fetchedAt,
      score: typeof item.score === "number" ? item.score : undefined,
    };
  });
}

function extractHostname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

