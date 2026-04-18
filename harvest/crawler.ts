export class BaseCrawler {
  async fetch(url: string): Promise<string> {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
            const html = await res.text();
            return html;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch ${url}: ${message}`);
        }
  }

  protected static normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  parseHTML(_html: string): any {
    // Implementations should override this method to parse the HTML and return structured data.
    return null;
  }

  async crawl(url: string): Promise<any> {
    // Fetch the HTML content and parse it to return structured data.
    const html = await this.fetch(url);
    try {
      const parsed_data = this.parseHTML(html);
      return parsed_data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Parsing failed: ${message}`);
    }
  }
}

