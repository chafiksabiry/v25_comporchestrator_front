export function normalizePresentationFromApi(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const slides = Array.isArray(r.slides)
    ? r.slides
    : Array.isArray(r.Slides)
      ? r.Slides
      : Array.isArray(r.slideList)
        ? r.slideList
        : [];
  return {
    ...r,
    title: (r.title as string) || 'Presentation',
    slides,
    totalSlides: (slides as unknown[]).length || (r.totalSlides as number) || 0
  };
}
