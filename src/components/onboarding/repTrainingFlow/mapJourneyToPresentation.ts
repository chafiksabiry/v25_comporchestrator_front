/**
 * Build a simple slide deck from a saved journey when no AI deck exists (same idea as training PresentationMapper).
 */
export function mapJourneyToPresentation(journey: Record<string, unknown>): {
  title: string;
  totalSlides: number;
  slides: any[];
  filetraining?: string;
} {
  const title = (journey.title || journey.name || 'Training') as string;
  const description = (journey.description || '') as string;
  const modules = (journey.modules || []) as any[];

  const allSlides: any[] = [
    {
      id: 0,
      type: 'cover',
      title,
      subtitle: description,
      content: description,
      visualConfig: { layout: 'split', theme: 'dark', accent: 'rose' }
    }
  ];

  modules.forEach((module: any, mIdx: number) => {
    allSlides.push({
      id: allSlides.length,
      type: 'agenda',
      title: `Module ${mIdx + 1}: ${module.title || 'Untitled'}`,
      content: module.description || '',
      visualConfig: { layout: 'gradient', theme: 'dark', accent: 'purple' }
    });

    const sections = module.sections || module.content || [];
    sections.forEach((section: any, sIdx: number) => {
      let content = '';
      let bullets: string[] = [];
      if (typeof section.content === 'string') {
        content = section.content;
      } else if (section.content && typeof section.content === 'object') {
        content =
          section.content.text ||
          section.content.description ||
          section.content.content ||
          section.content.value ||
          '';
        if (Array.isArray(section.content.bullets)) bullets = section.content.bullets;
      }
      if (!content) {
        content = section.text || section.description || section.value || '';
      }
      if (bullets.length === 0 && Array.isArray(section.bullets)) {
        bullets = section.bullets;
      }
      allSlides.push({
        id: allSlides.length,
        type: section.type === 'video' ? 'video' : 'content',
        title: section.title || `Section ${sIdx + 1}`,
        content,
        bullets,
        visualConfig: { layout: 'content', theme: 'light', accent: mIdx % 2 === 0 ? 'rose' : 'purple' }
      });
    });
  });

  allSlides.push({
    id: allSlides.length,
    type: 'conclusion',
    title: 'End of training',
    subtitle: 'You have reviewed all the content.',
    content: 'Thank you for completing this journey.',
    visualConfig: { layout: 'split', theme: 'dark', accent: 'rose' }
  });

  return {
    title,
    totalSlides: allSlides.length,
    slides: allSlides,
    filetraining: (journey.filetraining || journey.fileTrainingUrl) as string | undefined
  };
}
