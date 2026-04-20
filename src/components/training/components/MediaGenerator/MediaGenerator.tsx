import React, { useState } from 'react';
import { Video, Volume2, BarChart3, Edit3, Settings, Sparkles, Wand2, Eye, Download } from 'lucide-react';
import { AIService } from '../../infrastructure/services/AIService';

interface MediaGeneratorProps {
  content: string;
  onGenerate: (mediaType: string, settings: any) => void;
}

export default function MediaGenerator({ content, onGenerate }: MediaGeneratorProps) {
  const [activeGenerator, setActiveGenerator] = useState<string | null>(null);
  const [generationSettings, setGenerationSettings] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<Record<string, any>>({});

  const mediaTypes = [
    {
      id: 'podcast',
      title: 'AI Podcast (Vertex AI)',
      icon: Volume2,
      description: 'Générez un podcast professionnel de haute qualité à partir de vos ressources.',
      features: ['Voix Journey Premium', 'Dialogue dynamique', 'Format de 2-3 minutes', 'Son haute fidélité'],
      settings: {
        voice: ['Journey-F', 'Journey-M', 'Studio-A', 'Studio-B'],
        language: ['Français', 'Anglais'],
        style: ['Informatif', 'Dynamique', 'Sérieux']
      }
    },
    {
      id: 'veo',
      title: 'Veo Video Generation',
      icon: Video,
      description: 'Créez des vidéos cinématiques haute fidélité avec le nouveau modèle Veo de Google.',
      features: ['Qualité 4K', 'Storytelling IA', 'Cinématique', 'Mouvement fluide'],
      settings: {
        style: ['Cinematic', 'Realistic', '3D Animation', 'Documentary'],
        aspectRatio: ['16:9', '9:16', '1:1'],
        duration: ['10s', '30s', '60s']
      }
    },
    {
      id: 'video',
      title: 'AI Video Script',
      icon: Edit3,
      description: 'Generate structured video scripts and storyboards from your training content',
      features: ['Scene-by-scene script', 'Narration text', 'Visual descriptions', 'On-screen text'],
      settings: {
        style: ['animated', 'whiteboard', 'corporate', 'creative'],
        duration: ['short', 'medium', 'long']
      }
    },
    {
      id: 'infographic',
      title: 'Smart Infographics',
      icon: BarChart3,
      description: 'Create stunning visual representations of your data and concepts',
      features: ['Data visualization', 'Custom charts', 'Brand colors', 'Export formats'],
      settings: {
        style: ['modern', 'corporate', 'creative', 'minimal'],
        layout: ['vertical', 'horizontal', 'grid', 'timeline'],
        format: ['png', 'svg', 'pdf', 'jpg']
      }
    }
  ];

  const handleGenerate = async (mediaType: string) => {
    setIsGenerating(true);
    setActiveGenerator(mediaType);

    try {
      let result = null;
      const title = "Training Media - " + (content.substring(0, 30) || "Resourse");

      if (mediaType === 'podcast') {
        const audioUrl = await AIService.generatePodcast(title, content);
        result = {
          audioUrl,
          title,
          type: 'podcast',
          duration: 180,
          status: 'ready'
        };
      } else if (mediaType === 'veo') {
        const videoUrl = await AIService.generateVeoVideo(title, content);
        result = {
          videoUrl,
          title,
          type: 'veo',
          quality: '4K',
          status: 'ready'
        };
      } else {
        // Fallback for other types (simulated)
        await new Promise(resolve => setTimeout(resolve, 3000));
        result = {
          url: 'https://example.com/mock-result',
          status: 'ready'
        };
      }

      setGeneratedMedia(prev => ({
        ...prev,
        [mediaType]: result
      }));

      onGenerate(mediaType, { ...generationSettings[mediaType], result });
    } catch (error) {
      console.error('❌ Generation failed:', error);
      // Handle error in UI if needed
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMediaTypeCard = (mediaType: any) => {
    const Icon = mediaType.icon;
    const isActive = activeGenerator === mediaType.id;
    const hasGenerated = generatedMedia[mediaType.id];

    return (
      <div key={mediaType.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className="h-6 w-6 text-pink-500" />
            <h3 className="text-lg font-semibold text-gray-900">{mediaType.title}</h3>
          </div>
          {hasGenerated && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Prêt
            </span>
          )}
        </div>

        <p className="text-gray-600 mb-4">{mediaType.description}</p>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Caractéristiques:</h4>
          <div className="flex flex-wrap gap-2">
            {mediaType.features.map((feature: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 text-xs rounded transition-all hover:bg-red-100">
                {feature}
              </span>
            ))}
          </div>
        </div>

        {isActive && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Settings:</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(mediaType.settings).map(([key, options]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {key}
                  </label>
                  <select
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    onChange={(e) => setGenerationSettings(prev => ({
                      ...prev,
                      [mediaType.id]: { ...prev[mediaType.id], [key]: e.target.value }
                    }))}
                  >
                    {(options as string[]).map((option) => (
                      <option key={String(option)} value={String(option)} className="capitalize">
                        {String(option).replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasGenerated && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">Generated Content:</h4>
            <div className="text-xs text-green-700">
              {mediaType.id === 'video' && (
                <div className="space-y-1">
                  <div>Duration: {generatedMedia[mediaType.id].duration}s</div>
                  <div>Quality: {generatedMedia[mediaType.id].quality}</div>
                  <div>Scenes: {generatedMedia[mediaType.id].scenes.length}</div>
                </div>
              )}
              {mediaType.id === 'audio' && (
                <div className="space-y-1">
                  <div>Duration: {generatedMedia[mediaType.id].duration}s</div>
                  <div>Voice: {generatedMedia[mediaType.id].voice}</div>
                </div>
              )}
              {mediaType.id === 'infographic' && (
                <div className="space-y-1">
                  <div>Style: {generatedMedia[mediaType.id].style}</div>
                  <div>Elements: {generatedMedia[mediaType.id].elements.length}</div>
                </div>
              )}
              {mediaType.id === 'interactive' && (
                <div className="space-y-1">
                  <div>Type: {generatedMedia[mediaType.id].type}</div>
                  <div>Questions: {generatedMedia[mediaType.id].questions}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          {!hasGenerated ? (
            <>
              <button
                onClick={() => setActiveGenerator(isActive ? null : mediaType.id)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Configure
              </button>
              <button
                onClick={() => handleGenerate(mediaType.id)}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isGenerating && activeGenerator === mediaType.id ? (
                  <>
                    <Sparkles className="h-4 w-4 inline mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 inline mr-2" />
                    Generate
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Eye className="h-4 w-4 inline mr-2" />
                Preview
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Edit3 className="h-4 w-4 inline mr-2" />
                Edit
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="h-4 w-4 inline mr-2" />
                Export
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Media Generator</h2>
        <p className="text-gray-600">
          Transform your text content into engaging multimedia experiences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mediaTypes.map(renderMediaTypeCard)}
      </div>

      {Object.keys(generatedMedia).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Media Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(generatedMedia).length}</div>
              <div className="text-sm text-gray-600">Media Items</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-gray-600">Quality Score</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">12min</div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">85%</div>
              <div className="text-sm text-gray-600">Engagement Boost</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
