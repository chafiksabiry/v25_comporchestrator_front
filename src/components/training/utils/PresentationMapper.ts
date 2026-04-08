import { TrainingModule, IPresentation, ISlide } from '../types/core';

/**
 * Utility to map a TrainingModule to a Presentation format for slide-by-slide viewing.
 */
export const mapModuleToPresentation = (module: TrainingModule): IPresentation => {
  const sections = (module as any).sections || module.content || [];
  
  const slides: ISlide[] = sections.map((section: any, index: number) => {
    // Determine content and bullets
    let content = '';
    let bullets: string[] = [];
    
    if (typeof section.content === 'string') {
      content = section.content;
    } else if (section.content) {
      content = section.content.text || section.content.description || section.content.content || '';
      if (Array.isArray(section.content.bullets)) {
        bullets = section.content.bullets;
      } else if (Array.isArray(section.bullets)) {
        bullets = section.bullets;
      }
    }

    // Attempt to extract bullets from text if empty
    if (bullets.length === 0 && content.includes('\n- ')) {
      bullets = content.split('\n').filter(line => line.trim().startsWith('- ')).map(line => line.trim().substring(2));
      content = content.split('\n').filter(line => !line.trim().startsWith('- ')).join('\n');
    }

    return {
      id: index + 1,
      type: section.type === 'video' ? 'video' : 'content',
      title: section.title || `Section ${index + 1}`,
      content: content,
      bullets: bullets,
      visualConfig: {
        layout: content.length > 200 ? 'content' : 'gradient',
        theme: 'light',
        accent: index % 2 === 0 ? 'rose' : 'purple',
        icon: section.type === 'video' ? 'play' : 'book'
      }
    };
  });

  // Add a premium cover slide
  const slidesWithCover: ISlide[] = [
    {
      id: 0,
      type: 'cover',
      title: module.title,
      subtitle: module.description,
      visualConfig: {
        layout: 'split',
        theme: 'dark',
        accent: 'rose'
      }
    },
    ...slides,
    // Add a conclusion slide
    {
      id: slides.length + 1,
      type: 'conclusion',
      title: 'Félicitations !',
      subtitle: 'Vous avez terminé ce module.',
      content: 'Prêt pour le quiz ?',
      visualConfig: {
        layout: 'gradient',
        theme: 'dark',
        accent: 'purple'
      }
    }
  ];

  return {
    title: module.title,
    totalSlides: slidesWithCover.length,
    slides: slidesWithCover,
    estimatedTime: `${module.duration} min`
  };
};
