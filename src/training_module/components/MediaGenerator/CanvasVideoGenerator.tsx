import React, { useState, useRef, useEffect } from 'react';
import { Video, Play, Download, Settings, Loader2, CheckCircle, Volume2, Pause, RefreshCw } from 'lucide-react';
import { CanvasVideoService, WebSpeechService, VideoScene } from '../../infrastructure/services/CanvasVideoService';

interface CanvasVideoGeneratorProps {
  scenes: VideoScene[];
  title: string;
  onVideoGenerated?: (videoBlob: Blob) => void;
}

export default function CanvasVideoGenerator({ scenes, title, onVideoGenerated }: CanvasVideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoService = useRef<CanvasVideoService | null>(null);
  const speechService = useRef<WebSpeechService>(new WebSpeechService());
  const videoRef = useRef<HTMLVideoElement>(null);

  const [settings, setSettings] = useState({
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundColor: '#ffffff',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6'
  });

  useEffect(() => {
    videoService.current = new CanvasVideoService(settings);
    return () => {
      videoService.current?.cleanup();
    };
  }, [settings]);

  /**
   * Génère la vidéo complète
   */
  const handleGenerateVideo = async () => {
    if (!videoService.current) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);

      // Générer la vidéo
      const videoBlob = await videoService.current.generateVideo(scenes);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Créer une URL pour la vidéo
      const videoUrl = URL.createObjectURL(videoBlob);
      setGeneratedVideo(videoUrl);

      if (onVideoGenerated) {
        onVideoGenerated(videoBlob);
      }

      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de la génération de la vidéo:', error);
      setIsGenerating(false);
    }
  };

  /**
   * Génère la preview d'une scène
   */
  const generateScenePreview = async (sceneIndex: number) => {
    if (!canvasRef.current || !videoService.current) return;

    try {
      await videoService.current.generatePreview(canvasRef.current, scenes[sceneIndex]);
    } catch (error) {
      console.error('Erreur lors de la génération de la preview:', error);
    }
  };

  /**
   * Lit l'audio d'une scène
   */
  const playSceneAudio = async (sceneIndex: number) => {
    if (!speechService.current) return;

    try {
      setIsPlaying(true);
      setCurrentScene(sceneIndex);
      await speechService.current.speak(scenes[sceneIndex].narration, {
        lang: 'fr-FR',
        rate: 1,
        pitch: 1,
        volume: 1
      });
      setIsPlaying(false);
    } catch (error) {
      console.error('Erreur lors de la lecture audio:', error);
      setIsPlaying(false);
    }
  };

  /**
   * Arrête l'audio
   */
  const stopAudio = () => {
    speechService.current?.stop();
    setIsPlaying(false);
  };

  /**
   * Télécharge la vidéo
   */
  const downloadVideo = () => {
    if (!generatedVideo) return;

    const a = document.createElement('a');
    a.href = generatedVideo;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_video.webm`;
    a.click();
  };

  useEffect(() => {
    if (canvasRef.current && scenes.length > 0) {
      generateScenePreview(0);
    }
  }, [scenes]);

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Video className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">🎨 Génération Canvas (100% Gratuit)</span>
            </div>
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="text-purple-100 text-sm mt-1">
              {scenes.length} scènes • {scenes.reduce((sum, s) => sum + s.duration, 0)} secondes
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 p-4 border-b">
          <h4 className="font-semibold text-gray-800 mb-3">Paramètres de génération</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Largeur</label>
              <input
                type="number"
                value={settings.width}
                onChange={(e) => setSettings({...settings, width: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hauteur</label>
              <input
                type="number"
                value={settings.height}
                onChange={(e) => setSettings({...settings, height: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">FPS</label>
              <select
                value={settings.fps}
                onChange={(e) => setSettings({...settings, fps: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Couleur primaire</label>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                className="w-full h-10 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Couleur secondaire</label>
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                className="w-full h-10 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fond</label>
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})}
                className="w-full h-10 border rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Canvas */}
      <div className="p-6 bg-gray-900">
        <div className="relative max-w-4xl mx-auto">
          <canvas
            ref={canvasRef}
            width={settings.width}
            height={settings.height}
            className="w-full h-auto rounded-lg shadow-2xl border-4 border-purple-500"
          />
          
          {generatedVideo && (
            <video
              ref={videoRef}
              src={generatedVideo}
              controls
              className="w-full h-auto rounded-lg shadow-2xl border-4 border-green-500 mt-4"
            />
          )}
        </div>
      </div>

      {/* Scenes List */}
      <div className="p-6 bg-white">
        <h4 className="font-semibold text-gray-800 mb-4">Scènes à générer :</h4>
        <div className="space-y-3">
          {scenes.map((scene, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg transition-all ${
                currentScene === index 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <h5 className="font-semibold text-gray-800">{scene.title}</h5>
                    <span className="text-xs text-gray-500">{scene.duration}s</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{scene.narration.substring(0, 100)}...</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => generateScenePreview(index)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Prévisualiser"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => isPlaying && currentScene === index ? stopAudio() : playSceneAudio(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={isPlaying && currentScene === index ? "Arrêter" : "Écouter"}
                  >
                    {isPlaying && currentScene === index ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Controls */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-t">
        {!isGenerating && !generatedVideo && (
          <button
            onClick={handleGenerateVideo}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-lg flex items-center justify-center space-x-2 shadow-lg"
          >
            <Video className="w-6 h-6" />
            <span>Générer la vidéo complète</span>
          </button>
        )}

        {isGenerating && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              <span className="text-lg font-semibold text-gray-800">
                Génération en cours... {generationProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        {generatedVideo && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-600 mb-4">
              <CheckCircle className="w-6 h-6" />
              <span className="text-lg font-semibold">Vidéo générée avec succès !</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={downloadVideo}
                className="py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger</span>
              </button>
              <button
                onClick={() => {
                  setGeneratedVideo(null);
                  setGenerationProgress(0);
                }}
                className="py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Régénérer</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            ✨ Génération 100% gratuite avec Canvas API et Web Speech API
          </p>
        </div>
      </div>
    </div>
  );
}

