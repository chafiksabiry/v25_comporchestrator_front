import pptxgen from 'pptxgenjs';

export interface SlideData {
  title: string;
  content: string;
  bgColor: string;
  textColor: string;
}

export class PowerPointService {
  /**
   * Generate a PowerPoint file from slide data
   */
  static async generatePowerPoint(
    slides: SlideData[],
    presentationTitle: string = 'Professional Training'
  ): Promise<Blob> {
    const pptx = new pptxgen();

    // Presentation configuration
    pptx.author = 'AI Training Platform';
    pptx.company = 'Training Platform';
    pptx.subject = presentationTitle;
    pptx.title = presentationTitle;

    // Generate each slide
    slides.forEach((slideData, index) => {
      const slide = pptx.addSlide();

      // Background with gradient
      slide.background = { color: slideData.bgColor };

      // Decorative circles
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.5,
        y: 0.5,
        w: 1.2,
        h: 1.2,
        fill: { color: slideData.textColor, transparency: 90 }
      });

      slide.addShape(pptx.ShapeType.ellipse, {
        x: 8.5,
        y: 4.5,
        w: 1.5,
        h: 1.5,
        fill: { color: slideData.textColor, transparency: 90 }
      });

      // Title
      slide.addText(slideData.title, {
        x: 0.5,
        y: 2.0,
        w: 9.0,
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: slideData.textColor,
        align: 'center',
        valign: 'middle',
        fontFace: 'Arial'
      });

      // Content - Handle multiline text and long paragraphs
      const contentLines = slideData.content.split('\n').filter(line => line.trim());
      const isBulletList = slideData.content.includes('•');
      const isLongText = slideData.content.length > 100;
      
      if (isBulletList) {
        // Format as bullet points
        slide.addText(
          contentLines.map(line => ({
            text: line.replace('•', '').trim(),
            options: {
              bullet: true,
              breakLine: true
            }
          })),
          {
            x: 1.0,
            y: 3.0,
            w: 8.0,
            h: 3.0,
            fontSize: 18,
            color: slideData.textColor,
            align: 'left',
            valign: 'top',
            fontFace: 'Arial'
          }
        );
      } else if (isLongText) {
        // Long text as paragraph
        slide.addText(slideData.content, {
          x: 1.0,
          y: 3.0,
          w: 8.0,
          h: 3.0,
          fontSize: 16,
          color: slideData.textColor,
          align: 'left',
          valign: 'top',
          fontFace: 'Arial',
          wrap: true
        });
      } else if (contentLines.length > 1) {
        // Multiple lines
        slide.addText(
          contentLines.map(line => ({
            text: line.trim(),
            options: {
              breakLine: true
            }
          })),
          {
            x: 1.5,
            y: 3.2,
            w: 7.0,
            h: 2.5,
            fontSize: 20,
            color: slideData.textColor,
            align: 'left',
            valign: 'top',
            fontFace: 'Arial'
          }
        );
      } else {
        // Single line centered
        slide.addText(slideData.content, {
          x: 1.0,
          y: 3.8,
          w: 8.0,
          h: 1.0,
          fontSize: 24,
          color: slideData.textColor,
          align: 'center',
          valign: 'middle',
          fontFace: 'Arial'
        });
      }

      // Separator line
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.5,
        y: 5.2,
        w: 7.0,
        h: 0.02,
        fill: { color: slideData.textColor, transparency: 70 }
      });

      // Footer
      slide.addText('Powered by AI Training Platform', {
        x: 0.5,
        y: 5.4,
        w: 9.0,
        h: 0.3,
        fontSize: 12,
        color: slideData.textColor,
        align: 'center',
        fontFace: 'Arial'
      });

      // Slide number
      slide.addText(`${index + 1}`, {
        x: 9.2,
        y: 5.4,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: slideData.textColor,
        align: 'right',
        fontFace: 'Arial'
      });
    });

    // Generate PowerPoint file as Blob
    const pptxBlob = await pptx.write({ outputType: 'blob' });
    return pptxBlob as Blob;
  }

  /**
   * Download the PowerPoint file
   */
  static downloadPowerPoint(blob: Blob, filename: string = 'Presentation.pptx') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate slide preview images (for display)
   */
  static generateSlidePreview(slideData: SlideData): string {
    const cleanTitle = slideData.title
      .replace(/[<>&"]/g, '')
      .replace(/'/g, ' ')
      .substring(0, 60)
      .trim();
    
    const contentLines = slideData.content.split('\n').filter(line => line.trim());
    const isBulletList = slideData.content.includes('•');
    const isLongText = slideData.content.length > 100;
    
    // Generate content text elements
    let contentSVG = '';
    
    if (isBulletList) {
      // Bullet list
      contentLines.slice(0, 5).forEach((line, i) => {
        const cleanLine = line
          .replace(/[<>&"]/g, '')
          .replace(/'/g, ' ')
          .replace(/•/g, '>')
          .substring(0, 60)
          .trim();
        
        contentSVG += `<text x="150" y="${330 + i * 35}" font-family="Arial" font-size="18" fill="${slideData.textColor}" text-anchor="start" opacity="0.9">${cleanLine}</text>`;
      });
    } else if (isLongText) {
      // Long paragraph - split into multiple lines
      const words = slideData.content.replace(/[<>&"]/g, '').replace(/'/g, ' ').split(' ');
      let currentLine = '';
      let lineCount = 0;
      const maxLines = 6;
      const maxCharsPerLine = 70;
      
      for (let i = 0; i < words.length && lineCount < maxLines; i++) {
        if ((currentLine + ' ' + words[i]).length > maxCharsPerLine) {
          contentSVG += `<text x="150" y="${320 + lineCount * 30}" font-family="Arial" font-size="16" fill="${slideData.textColor}" text-anchor="start" opacity="0.9">${currentLine.trim()}</text>`;
          currentLine = words[i];
          lineCount++;
        } else {
          currentLine += ' ' + words[i];
        }
      }
      
      // Add remaining text
      if (currentLine.trim() && lineCount < maxLines) {
        contentSVG += `<text x="150" y="${320 + lineCount * 30}" font-family="Arial" font-size="16" fill="${slideData.textColor}" text-anchor="start" opacity="0.9">${currentLine.trim()}</text>`;
      }
    } else if (contentLines.length > 1) {
      // Multi-line content
      contentLines.slice(0, 5).forEach((line, i) => {
        const cleanLine = line
          .replace(/[<>&"]/g, '')
          .replace(/'/g, ' ')
          .substring(0, 65)
          .trim();
        
        contentSVG += `<text x="600" y="${340 + i * 35}" font-family="Arial" font-size="20" fill="${slideData.textColor}" text-anchor="middle" opacity="0.9">${cleanLine}</text>`;
      });
    } else {
      // Single line
      const cleanContent = slideData.content
        .replace(/[<>&"]/g, '')
        .replace(/'/g, ' ')
        .substring(0, 80)
        .trim();
      contentSVG = `<text x="600" y="400" font-family="Arial" font-size="24" fill="${slideData.textColor}" text-anchor="middle" dominant-baseline="middle" opacity="0.9">${cleanContent}</text>`;
    }
    
    const uniqueId = Date.now() + Math.random();
    const svg = `<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${slideData.bgColor};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${slideData.bgColor};stop-opacity:0.85"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bgGrad${uniqueId})"/>
  <circle cx="120" cy="120" r="90" fill="${slideData.textColor}" opacity="0.08"/>
  <circle cx="1080" cy="555" r="110" fill="${slideData.textColor}" opacity="0.08"/>
  <text x="600" y="250" font-family="Arial" font-size="48" font-weight="bold" fill="${slideData.textColor}" text-anchor="middle" dominant-baseline="middle">${cleanTitle}</text>
  ${contentSVG}
  <rect x="120" y="570" width="960" height="2" fill="${slideData.textColor}" opacity="0.25"/>
  <text x="600" y="625" font-family="Arial" font-size="14" fill="${slideData.textColor}" text-anchor="middle" opacity="0.65">Powered by AI Training Platform</text>
</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}

