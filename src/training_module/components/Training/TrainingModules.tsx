import React from 'react';
import { Play, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { TrainingModule } from '../../types';

interface TrainingModulesProps {
  modules: TrainingModule[];
  onModuleSelect?: (moduleId: string) => void;
}

export default function TrainingModules({ modules, onModuleSelect }: TrainingModulesProps) {
  const completedCount = modules.filter(m => m.completed).length;
  const totalCount = modules.length;

  console.log('[TrainingModules] Received', modules.length, 'modules');
  console.log('[TrainingModules] Modules sample:', modules.slice(0, 2));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
        <div className="text-sm text-gray-600 font-medium">
          {completedCount} of {totalCount} completed
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const isCompleted = module.completed;
          const hasProgress = module.progress > 0;

          return (
            <div
              key={module.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
            >
              <div className="p-6">
                {/* Header with Icon and Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted
                        ? 'bg-green-100'
                        : hasProgress
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                      <BookOpen className={`h-5 w-5 ${isCompleted
                          ? 'text-green-600'
                          : hasProgress
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`} />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isCompleted
                        ? 'bg-green-50 text-green-700'
                        : hasProgress
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                      Training
                    </span>
                  </div>
                  {isCompleted && (
                    <div className="relative">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Module Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {module.title}
                </h3>

                {/* Module Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                  {module.description || 'No description available'}
                </p>

                {/* Duration */}
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {typeof module.duration === 'number'
                      ? `${module.duration} ${module.duration === 1 ? 'hour' : 'hours'}`
                      : module.duration || 'Duration not specified'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Progress</span>
                    <span className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-blue-600'
                      }`}>
                      {module.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                      style={{ width: `${module.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Topics Covered */}
                {Array.isArray(module.topics) && module.topics.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Topics Covered:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {module.topics.slice(0, 3).map((topic, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-gray-50 text-gray-700 text-xs rounded-md border border-gray-200"
                        >
                          {topic}
                        </span>
                      ))}
                      {module.topics.length > 3 && (
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-md border border-gray-200">
                          +{module.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${isCompleted
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      : hasProgress
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  onClick={() => {
                    onModuleSelect?.(module.id);
                    // Scroll to top when selecting a module
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <Play className={`h-4 w-4 ${isCompleted ? '' : hasProgress ? '' : ''}`} />
                  <span>
                    {isCompleted
                      ? 'Review'
                      : hasProgress
                        ? 'Continue'
                        : 'Start Training'
                    }
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {modules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No journey training modules available yet.</p>
        </div>
      )}
    </div>
  );
}