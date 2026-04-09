import React from 'react';
import { TrendingUp, Brain, CheckCircle, Star, Target } from 'lucide-react';
import { TrainingModule } from '../../types';

interface ModuleSidebarProps {
  sectionProgress: number;
  engagementScore: number;
  comprehensionScore: number;
  sectionTitles: string[];
  currentSection: number;
  handleInteraction: () => void;
  setCurrentSection: (index: number) => void;
  setSectionProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  bookmarks: number[];
  jumpToBookmark: (time: number) => void;
  formatTime: (time: number) => string;
  module: TrainingModule;
}

export const ModuleSidebar: React.FC<ModuleSidebarProps> = ({
  sectionProgress,
  engagementScore,
  comprehensionScore,
  sectionTitles,
  currentSection,
  handleInteraction,
  setCurrentSection,
  setSectionProgress,
  setCurrentTime,
  bookmarks,
  jumpToBookmark,
  formatTime,
  module
}) => {
  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Learning Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Module Progress</span>
              <span className="text-sm font-bold text-gray-900">{Math.round(sectionProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${sectionProgress}%`,
                  background: 'linear-gradient(to right, var(--primary-color, #3b82f6), var(--secondary-color, #8b5cf6))'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
              <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-600">{engagementScore}%</div>
              <div className="text-xs text-gray-600">Engagement</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Brain className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-600">{comprehensionScore}%</div>
              <div className="text-xs text-gray-600">Comprehension</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Sections */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Module Sections</h3>
        <div className="space-y-2">
          {sectionTitles.map((title: string, index: number) => (
            <button
              key={index}
              onClick={() => {
                handleInteraction();
                setCurrentSection(index);
                setSectionProgress(0);
                setCurrentTime(0);
              }}
              className={`w-full text-left p-3 rounded-lg transition-colors border ${index === currentSection
                ? 'bg-[var(--primary-color,#eff6ff)]05 border-[var(--primary-color,#3b82f6)] text-[var(--primary-color,#1e40af)]'
                : index < currentSection
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                }`}
              style={index === currentSection ? {
                backgroundColor: 'var(--primary-color-light, rgba(59, 130, 246, 0.1))',
                borderColor: 'var(--primary-color, #3b82f6)'
              } : {}}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < currentSection ? 'bg-green-500 text-white' :
                  index === currentSection ? 'bg-[var(--primary-color,#3b82f6)] text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                  {index < currentSection ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="font-medium text-sm truncate">{title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Bookmarks</h3>
          <div className="space-y-2">
            {bookmarks.map((time, index) => (
              <button
                key={index}
                onClick={() => jumpToBookmark(time)}
                className="w-full text-left p-3 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-gray-900">
                    Bookmark {index + 1} - {formatTime(time)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Learning Objectives */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Learning Objectives</h3>
        <ul className="space-y-3">
          {module.learningObjectives?.map((objective, index) => (
            <li key={index} className="flex items-start space-x-3 text-sm">
              <Target className="h-4 w-4 text-[var(--primary-color,#3b82f6)] mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 leading-relaxed">{objective}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
