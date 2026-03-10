/**
 * Service de génération de vidéos animées avec Canvas API
 * 100% Gratuit - Fonctionne dans le navigateur
 */

export interface VideoScene {
  title: string;
  narration: string;
  visual: string;
  duration: number; // en secondes
  onScreenText: string[];
}

export interface CanvasVideoOptions {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
}

export class CanvasVideoService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private options: CanvasVideoOptions;

  constructor(options: Partial<CanvasVideoOptions> = {}) {
    this.options = {
      width: options.width || 1920,
      height: options.height || 1080,
      fps: options.fps || 30,
      backgroundColor: options.backgroundColor || '#ffffff',
      primaryColor: options.primaryColor || '#3b82f6',
      secondaryColor: options.secondaryColor || '#8b5cf6'
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Génère une vidéo complète à partir de scènes
   */
  async generateVideo(scenes: VideoScene[]): Promise<Blob> {
    this.chunks = [];

    // Configuration du MediaRecorder
    const stream = this.canvas.captureStream(this.options.fps);
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5 Mbps
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    // Démarrer l'enregistrement
    this.mediaRecorder.start();

    // Générer chaque scène
    for (const scene of scenes) {
      await this.renderScene(scene);
    }

    // Arrêter l'enregistrement
    this.mediaRecorder.stop();

    // Attendre que l'enregistrement soit terminé
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
    });
  }

  /**
   * Génère une image statique d'une scène
   */
  async generateThumbnail(scene: VideoScene): Promise<string> {
    await this.renderSceneFrame(scene, 0);
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Rend une scène complète avec animation
   */
  private async renderScene(scene: VideoScene): Promise<void> {
    const totalFrames = scene.duration * this.options.fps;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      await this.renderSceneFrame(scene, progress);
      await this.waitForNextFrame();
    }
  }

  /**
   * Rend une frame d'une scène
   */
  private async renderSceneFrame(scene: VideoScene, progress: number): Promise<void> {
    const { ctx, canvas } = this;
    const { width, height, backgroundColor, primaryColor, secondaryColor } = this.options;

    // Effacer le canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Dessiner le fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `${primaryColor}15`);
    gradient.addColorStop(1, `${secondaryColor}15`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animation d'entrée du titre (0-20% du temps)
    if (progress < 0.2) {
      const titleProgress = progress / 0.2;
      this.drawTitle(scene.title, titleProgress);
    } else {
      this.drawTitle(scene.title, 1);
    }

    // Dessiner le contenu visuel (20-80% du temps)
    if (progress >= 0.2 && progress <= 0.8) {
      const contentProgress = (progress - 0.2) / 0.6;
      this.drawVisualContent(scene.visual, contentProgress);
    }

    // Afficher le texte à l'écran progressivement
    if (progress >= 0.3) {
      const textProgress = (progress - 0.3) / 0.7;
      this.drawOnScreenText(scene.onScreenText, textProgress);
    }

    // Animation de sortie (90-100% du temps)
    if (progress > 0.9) {
      const fadeProgress = (progress - 0.9) / 0.1;
      ctx.globalAlpha = 1 - fadeProgress;
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Dessine le titre avec animation améliorée
   */
  private drawTitle(title: string, progress: number): void {
    const { ctx, canvas } = this;
    const { primaryColor, secondaryColor } = this.options;

    // Position avec animation élastique
    const easeProgress = this.easeOutElastic(progress);
    const y = 200;
    const scale = 0.5 + (easeProgress * 0.5);
    
    ctx.save();
    ctx.globalAlpha = progress;
    
    // Dégradé de fond moderne
    const gradient = ctx.createLinearGradient(0, y - 100, canvas.width, y + 100);
    gradient.addColorStop(0, `${primaryColor}30`);
    gradient.addColorStop(0.5, `${secondaryColor}30`);
    gradient.addColorStop(1, `${primaryColor}30`);
    ctx.fillStyle = gradient;
    
    // Forme arrondie pour le fond
    this.roundRect(
      canvas.width / 2 - 800 * scale,
      y - 80 * scale,
      1600 * scale,
      160 * scale,
      20
    );
    ctx.fill();

    // Ombre portée pour le texte
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;

    // Texte principal avec dégradé
    const textGradient = ctx.createLinearGradient(0, y - 50, 0, y + 50);
    textGradient.addColorStop(0, primaryColor);
    textGradient.addColorStop(1, secondaryColor);
    
    ctx.font = `bold ${Math.floor(80 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = textGradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, y);

    // Ligne décorative animée
    const lineWidth = 600 * progress;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - lineWidth / 2, y + 100);
    ctx.lineTo(canvas.width / 2 + lineWidth / 2, y + 100);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Animation élastique
   */
  private easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }

  /**
   * Dessine un rectangle arrondi
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Dessine le contenu visuel amélioré
   */
  private drawVisualContent(visual: string, progress: number): void {
    const { ctx, canvas } = this;
    const { primaryColor, secondaryColor } = this.options;

    const y = 400;
    const boxWidth = canvas.width - 200;
    const boxHeight = 450;
    const padding = 60;
    
    ctx.save();
    
    // Fond avec dégradé subtil
    const bgGradient = ctx.createLinearGradient(100, y, 100, y + boxHeight);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#f9fafb');
    ctx.fillStyle = bgGradient;
    this.roundRect(100, y, boxWidth, boxHeight, 15);
    ctx.fill();
    
    // Bordure avec ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.strokeStyle = `${secondaryColor}40`;
    ctx.lineWidth = 3;
    this.roundRect(100, y, boxWidth, boxHeight, 15);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Icône décorative dans le coin
    ctx.fillStyle = `${primaryColor}20`;
    ctx.beginPath();
    ctx.arc(150, y + 50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💡', 150, y + 60);

    // Dessiner le texte du visuel avec meilleur formatting
    ctx.font = '36px Arial, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'left';
    
    const maxWidth = boxWidth - padding * 2;
    const words = visual.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);

    // Afficher les lignes progressivement avec effet
    const linesToShow = Math.floor(lines.length * progress);
    lines.slice(0, linesToShow + 1).forEach((line, i) => {
      const lineProgress = i < linesToShow ? 1 : (lines.length * progress - linesToShow);
      const xOffset = (1 - lineProgress) * 30;
      
      ctx.globalAlpha = lineProgress;
      ctx.fillText(line, 100 + padding + xOffset, y + 80 + i * 50);
    });

    ctx.restore();
  }

  /**
   * Dessine le texte à l'écran amélioré
   */
  private drawOnScreenText(texts: string[], progress: number): void {
    const { ctx, canvas } = this;
    const { primaryColor, secondaryColor } = this.options;

    const startY = 900;
    const textsToShow = Math.min(texts.length, Math.floor(texts.length * progress * 1.5));

    texts.slice(0, textsToShow).forEach((text, i) => {
      const y = startY + i * 70;
      const itemProgress = Math.min(1, (progress * texts.length - i) * 2);
      const xOffset = (1 - itemProgress) * 50;

      ctx.save();
      ctx.globalAlpha = itemProgress;

      // Fond pour chaque élément
      const textWidth = ctx.measureText(text).width;
      const bgGradient = ctx.createLinearGradient(120, y - 20, 120 + textWidth + 100, y + 20);
      bgGradient.addColorStop(0, `${primaryColor}15`);
      bgGradient.addColorStop(1, `${secondaryColor}15`);
      ctx.fillStyle = bgGradient;
      this.roundRect(120 + xOffset, y - 25, textWidth + 100, 55, 8);
      ctx.fill();

      // Numéro stylisé
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(160 + xOffset, y + 5, 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((i + 1).toString(), 160 + xOffset, y + 5);

      // Texte principal
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 200 + xOffset, y + 5);

      ctx.restore();
    });

    ctx.globalAlpha = 1;
  }

  /**
   * Attend la prochaine frame
   */
  private waitForNextFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    });
  }

  /**
   * Génère une preview en temps réel sur un canvas existant
   */
  async generatePreview(targetCanvas: HTMLCanvasElement, scene: VideoScene): Promise<void> {
    const tempCanvas = this.canvas;
    this.canvas = targetCanvas;
    this.ctx = targetCanvas.getContext('2d')!;

    await this.renderSceneFrame(scene, 0.5); // Frame du milieu

    this.canvas = tempCanvas;
    this.ctx = tempCanvas.getContext('2d')!;
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.chunks = [];
  }
}

/**
 * Service d'audio avec Web Speech API (Gratuit)
 */
export class WebSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  /**
   * Charge les voix disponibles
   */
  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  /**
   * Obtient les voix disponibles pour une langue
   */
  getVoices(lang: string = 'fr-FR'): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));
  }

  /**
   * Génère l'audio d'un texte
   */
  async speak(text: string, options: {
    lang?: string;
    voice?: SpeechSynthesisVoice;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = options.lang || 'fr-FR';
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        const voices = this.getVoices(utterance.lang);
        if (voices.length > 0) {
          utterance.voice = voices[0];
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synth.speak(utterance);
    });
  }

  /**
   * Arrête la lecture en cours
   */
  stop(): void {
    this.synth.cancel();
  }

  /**
   * Met en pause
   */
  pause(): void {
    this.synth.pause();
  }

  /**
   * Reprend la lecture
   */
  resume(): void {
    this.synth.resume();
  }
}

