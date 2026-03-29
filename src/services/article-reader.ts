/**
 * Article Reader — fetches and extracts content from news article URLs.
 *
 * GDELT only returns headlines (no summaries). To do real analysis,
 * Claude needs the actual article content. This service fetches the
 * HTML from article URLs and extracts the readable text.
 *
 * Uses a simple approach: fetch the page, strip HTML tags, extract
 * the main content by heuristic (longest text block). Good enough
 * for Claude to reason about the substance of the article.
 *
 * Rate-limited: max 5 articles per analysis to keep latency reasonable.
 */

interface ArticleContent {
  url: string;
  title: string;
  text: string;        // extracted article text (first ~1500 chars)
  success: boolean;
}

/**
 * Strip HTML tags and extract readable text.
 */
function extractText(html: string): string {
  // Remove script, style, nav, header, footer blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Extract text from paragraph tags (most article content is in <p>)
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(text)) !== null) {
    const clean = match[1]
      .replace(/<[^>]+>/g, "")  // strip remaining tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (clean.length > 40) {  // skip tiny fragments
      paragraphs.push(clean);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }

  // Fallback: strip all tags
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch a single article and extract its content.
 */
async function fetchArticle(url: string, title: string): Promise<ArticleContent> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TradeWizard/1.0 (market-analysis-bot)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { url, title, text: "", success: false };
    }

    const html = await response.text();
    const text = extractText(html);

    // Truncate to ~1500 chars to keep Claude's context manageable
    const truncated = text.length > 1500 ? text.slice(0, 1500) + "..." : text;

    return {
      url,
      title,
      text: truncated,
      success: truncated.length > 100, // need at least some substance
    };
  } catch {
    return { url, title, text: "", success: false };
  }
}

/**
 * Fetch content for multiple articles in parallel.
 * Limited to 5 articles to keep latency under control.
 */
export async function fetchArticleContents(
  articles: { url: string; title: string }[],
  maxArticles = 5
): Promise<ArticleContent[]> {
  const toFetch = articles.slice(0, maxArticles);
  const results = await Promise.all(
    toFetch.map(a => fetchArticle(a.url, a.title))
  );
  return results;
}
