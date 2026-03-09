import React, { useState } from 'react';
import { Video, Volume2, Image, BarChart3, Zap, Play, Pause, Download, Settings, Wand2, Sparkles, Eye, CreditCard as Edit3 } from 'lucide-react';

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
      id: 'video',
      title: 'AI Video Generation',
      icon: Video,
      description: 'Convert text to engaging animated videos with AI narration',
      features: ['Animated scenes', 'AI voice-over', 'Custom branding', 'Multiple styles'],
      settings: {
        style: ['animated', 'whiteboard', 'corporate', 'creative'],
        voice: ['professional-male', 'professional-female', 'casual-male', 'casual-female'],
        duration: ['short', 'medium', 'long'],
        quality: ['720p', '1080p', '4K']
      }
    },
    {
      id: 'audio',
      title: 'AI Audio Narration',
      icon: Volume2,
      description: 'Generate professional voice-overs and audio content',
      features: ['Natural voices', 'Multiple languages', 'Emotion control', 'Background music'],
      settings: {
        voice: ['professional', 'conversational', 'energetic', 'calm'],
        speed: ['slow', 'normal', 'fast'],
        language: ['english', 'spanish', 'french', 'german'],
        music: ['none', 'corporate', 'upbeat', 'ambient']
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
        colors: ['blue', 'green', 'purple', 'orange'],
        format: ['png', 'svg', 'pdf', 'jpg']
      }
    },
    {
      id: 'interactive',
      title: 'Interactive Elements',
      icon: Zap,
      description: 'Build engaging interactive content and simulations',
      features: ['Drag & drop', 'Scenarios', 'Quizzes', 'Simulations'],
      settings: {
        type: ['quiz', 'scenario', 'simulation', 'drag-drop'],
        difficulty: ['easy', 'medium', 'hard'],
        feedback: ['immediate', 'delayed', 'summary'],
        scoring: ['points', 'percentage', 'pass-fail']
      }
    }
  ];

  const handleGenerate = async (mediaType: string) => {
    setIsGenerating(true);
    setActiveGenerator(mediaType);

    // Simulate AI generation process
    await new Promise(resolve => setTimeout(resolve, 5190));

    const mockGeneratedContent = {
      video: {
        url: 'https://example.com/generated-video.mp4',
        thumbnail: 'https://example.com/thumbnail.jpg',
        duration: 180,
        scenes: ['Introduction', 'Main Content', 'Summary'],
        quality: '1080p'
      },
      audio: {
        url: 'https://example.com/generated-audio.mp3',
        duration: 120,
        voice: 'professional-female',
        transcript: content.substring(0, 200) + '...'
      },
      infographic: {
        url: 'https://example.com/infographic.png',
        style: 'modern',
        elements: ['Title', 'Key Points', 'Statistics', 'Call to Action'],
        dimensions: '1920x1080'
      },
      interactive: {
        type: 'quiz',
        questions: 5,
        difficulty: 'medium',
        estimatedTime: '10 minutes'
      }
    };

    setGeneratedMedia(prev => ({
      ...prev,
      [mediaType]: mockGeneratedContent[mediaType as keyof typeof mockGeneratedContent]
    }));

    setIsGenerating(false);
    onGenerate(mediaType, generationSettings[mediaType] || {});
  };

  const renderMediaTypeCard = (mediaType: any) => {
    const Icon = mediaType.icon;
    const isActive = activeGenerator === mediaType.id;
    const hasGenerated = generatedMedia[mediaType.id];

    return (
      <div key={mediaType.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">{mediaType.title}</h3>
          </div>
          {hasGenerated && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Generated
            </span>
          )}
        </div>

        <p className="text-gray-600 mb-4">{mediaType.description}</p>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
          <div className="flex flex-wrap gap-2">
            {mediaType.features.map((feature: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
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
                      <option key={option} value={option} className="capitalize">
                        {option.replace('-', ' ')}
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