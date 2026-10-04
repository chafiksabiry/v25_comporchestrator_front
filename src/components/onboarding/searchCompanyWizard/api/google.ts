import axios from "axios";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      "og:description"?: string;
      "og:image"?: string;
    }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
}

function localeParams(language: "fr" | "en") {
  if (language === "fr") {
    return {
      hl: "fr",
      gl: "fr",
      lr: "lang_fr",
      cr: "countryFR",
    };
  }
  return {
    hl: "en",
    gl: "us",
    lr: "lang_en",
  };
}

/** Prefer local TLD / language-path results for the active UI language. */
function rankForLanguage(items: GoogleSearchResult[], language: "fr" | "en"): GoogleSearchResult[] {
  const score = (link: string) => {
    try {
      const host = new URL(link).hostname.toLowerCase();
      const path = new URL(link).pathname.toLowerCase();
      if (language === "fr") {
        if (host.endsWith(".fr") || host.includes(".fr.")) return 3;
        if (path.includes("/fr/") || path.endsWith("/fr") || path.includes("/fr-fr")) return 2;
        if (host.includes("wikipedia.org") && path.startsWith("/wiki/") === false && path.includes("/fr/"))
          return 2;
        if (host.startsWith("fr.") || host.includes("fr.wikipedia")) return 3;
      } else {
        if (host.endsWith(".com") || host.endsWith(".us") || host.includes("en.wikipedia")) return 2;
        if (path.includes("/en/") || path.endsWith("/en")) return 1;
      }
    } catch {
      /* ignore */
    }
    return 0;
  };
  return [...items].sort((a, b) => score(b.link) - score(a.link));
}

export const googleApi = {
  async search(
    query: string,
    language: "fr" | "en" = "fr"
  ): Promise<GoogleSearchResult[]> {
    const locale = localeParams(language);
    const fetchOnce = async (params: Record<string, string | number>) => {
      const response = await axios.get<GoogleSearchResponse>(
        "https://www.googleapis.com/customsearch/v1",
        { params }
      );
      return response.data.items || [];
    };

    let items = await fetchOnce({
      key: GOOGLE_API_KEY,
      cx: SEARCH_ENGINE_ID,
      q: query,
      num: 10,
      ...locale,
    });

    // Strict lr/cr can return nothing for some brands — keep FR bias without hard filter.
    if (!items.length && language === "fr") {
      items = await fetchOnce({
        key: GOOGLE_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: query,
        num: 10,
        hl: "fr",
        gl: "fr",
      });
    }

    return rankForLanguage(items, language);
  },
};
