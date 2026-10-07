/**
 * Normalize a journey section body into markdown/text for viewers.
 * Never use String(object) — that yields "[object Object]".
 */
export function resolveSectionMarkdown(section: unknown): string {
  if (section == null) return '';
  if (typeof section === 'string') return section;

  const s = section as Record<string, any>;
  const content = s.content;

  if (typeof content === 'string') return content;

  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const nested = content as Record<string, any>;
    const fromNested =
      pickString(nested.text) ||
      pickString(nested.description) ||
      pickString(nested.content) ||
      pickString(nested.value) ||
      pickString(nested.markdown) ||
      bulletsToMarkdown(nested.bullets) ||
      bulletsToMarkdown(nested.keyPoints);
    if (fromNested) return fromNested;
  }

  return (
    pickString(s.text) ||
    pickString(s.description) ||
    pickString(s.aiDescription) ||
    pickString(s.markdown) ||
    pickString(s.detailedContentMarkdown) ||
    bulletsToMarkdown(s.bullets) ||
    bulletsToMarkdown(s.keyPoints) ||
    ''
  );
}

/** Persist a string (or keep media objects); never embed the whole section. */
export function normalizeSectionContentForSave(section: unknown): string | Record<string, any> {
  const s = (section || {}) as Record<string, any>;
  const c = s.content;

  if (typeof c === 'string') return c;

  if (c && typeof c === 'object' && !Array.isArray(c)) {
    // Keep upload/media payloads intact
    if (c.file || c.youtubeUrl || c.url || c.type === 'video' || c.type === 'document') {
      return c;
    }
    const text =
      pickString(c.text) ||
      pickString(c.description) ||
      pickString(c.markdown) ||
      bulletsToMarkdown(c.bullets) ||
      bulletsToMarkdown(c.keyPoints);
    if (text) return text;
  }

  const fallback =
    pickString(s.text) ||
    pickString(s.description) ||
    bulletsToMarkdown(s.bullets) ||
    bulletsToMarkdown(s.keyPoints);
  return fallback || '';
}

function pickString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '';
}

function bulletsToMarkdown(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  return value
    .map((b) => String(b ?? '').trim())
    .filter(Boolean)
    .map((b) => (b.startsWith('-') || b.startsWith('*') ? b : `- ${b}`))
    .join('\n');
}
