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
      title: 'Well done!',
      subtitle: 'You have completed this module.',
      content: 'Ready for the quiz?',
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
    estimatedTime: `${module.duration} min`,
    filetraining: (module as any).filetraining || (module as any).fileTrainingUrl
  };
};

/**
 * Utility to map a whole Training Journey to a Presentation format.
 * This is useful for providing a slide view even if AI slides weren't generated.
 */
export const mapJourneyToPresentation = (journey: any): IPresentation => {
  const title = journey.title || journey.name || 'Training';
  const description = journey.description || '';
  const modules = journey.modules || [];
  
  let allSlides: ISlide[] = [];
  
  // Add Journey Cover
  allSlides.push({
    id: 0,
    type: 'cover',
    title: title,
    subtitle: description,
    visualConfig: {
      layout: 'split',
      theme: 'dark',
      accent: 'rose'
    }
  });

  // Process each module
  modules.forEach((module: any, mIdx: number) => {
    // Module Title Slide
    allSlides.push({
      id: allSlides.length,
      type: 'agenda',
      title: `Module ${mIdx + 1}: ${module.title || 'Untitled'}`,
      content: module.description || '',
      visualConfig: {
        layout: 'gradient',
        theme: 'dark',
        accent: 'purple'
      }
    });

    const sections = module.sections || module.content || [];
    sections.forEach((section: any, sIdx: number) => {
      let content = '';
      let bullets: string[] = [];
      
      // Robust content extraction
      if (typeof section.content === 'string') {
        content = section.content;
      } else if (section.content && typeof section.content === 'object') {
        content = section.content.text || section.content.description || section.content.content || section.content.value || '';
        if (Array.isArray(section.content.bullets)) {
          bullets = section.content.bullets;
        }
      }

      // Fallback to top-level fields if content object is missing or empty
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
        content: content,
        bullets: bullets,
        visualConfig: {
          layout: 'content',
          theme: 'light',
          accent: mIdx % 2 === 0 ? 'rose' : 'purple'
        }
      });
    });
  });

  // Journey Cover updated to include description as content for the right-side split area
  allSlides[0].content = description;

  // Conclusion Slide
  allSlides.push({
    id: allSlides.length,
    type: 'conclusion',
    title: 'End of training',
    subtitle: 'You have reviewed all the content.',
    content: 'Thank you for completing this journey.',
    visualConfig: {
      layout: 'split',
      theme: 'dark',
      accent: 'rose'
    }
  });

  return {
    title: title,
    totalSlides: allSlides.length,
    slides: allSlides,
    estimatedTime: 'N/A',
    filetraining: journey.filetraining || journey.fileTrainingUrl
  };
};
