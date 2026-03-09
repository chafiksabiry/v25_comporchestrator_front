import React from 'react';
import { Play, Clock, CheckCircle, BookOpen, Users, Award } from 'lucide-react';

interface JourneyTrainingProps {
  journeys: any[];
  onJourneySelect?: (journeyId: string) => void;
}

export default function JourneyTraining({ journeys, onJourneySelect }: JourneyTrainingProps) {
  const activeJourneys = journeys.filter(j => j.status === 'active');
  const completedJourneys = journeys.filter(j => j.status === 'completed');
  const completedCount = completedJourneys.length;
  const totalCount = journeys.length;

  console.log('[JourneyTraining] Received', journeys.length, 'journeys');

  const calculateJourneyDuration = (journey: any): number => {
    // Check if using new structure (moduleIds) or old structure (modules array)
    const moduleIds = journey.moduleIds || [];
    const modules = journey.modules || [];

    if (moduleIds.length > 0 || modules.length > 0) {
      // For new structure, we can't calculate duration without loading modules
      // For old structure, calculate from embedded modules
      if (modules.length > 0) {
        const totalMinutes = modules.reduce((sum: number, module: any) => {
          if (typeof module.duration === 'number') {
            return sum + module.duration;
          } else if (Array.isArray(module.content) && module.content.length > 0) {
            return sum + module.content.reduce((contentSum: number, item: any) => {
              return contentSum + (item.duration || 0);
            }, 0);
          }
          return sum;
        }, 0);
        return Math.round(totalMinutes / 60 * 10) / 10; // Convert to hours
      }
      // For new structure, return 0 or estimate based on moduleIds count
      return moduleIds.length * 1; // Estimate 1 hour per module
    }
    return 0;
  };

  const getJourneyTopics = (journey: any): string[] => {
    // Check if using new structure (moduleIds) or old structure (modules array)
    const modules = journey.modules || [];

    if (modules.length > 0) {
      const allTopics: string[] = [];
      modules.forEach((module: any) => {
        if (Array.isArray(module.topics)) {
          allTopics.push(...module.topics);
        } else if (Array.isArray(module.learningObjectives)) {
          allTopics.push(...module.learningObjectives.slice(0, 3).map((obj: any) =>
            typeof obj === 'string' ? obj : obj.text || obj.title || ''
          ));
        }
      });
      return [...new Set(allTopics)].slice(0, 5); // Remove duplicates and limit to 5
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Journey Training</h1>
        <div className="text-sm text-gray-600 font-medium">
          {completedCount} of {totalCount} completed
        </div>
      </div>

      {/* Journeys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {journeys.map((journey) => {
          if (!journey) return null;
          const isCompleted = journey.status === 'completed';
          const isActive = journey.status === 'active';
          // Support both new structure (moduleIds) and old structure (modules)
          const modulesCount = Array.isArray(journey.moduleIds) && journey.moduleIds.length > 0
            ? journey.moduleIds.length
            : (Array.isArray(journey.modules) ? journey.modules.length : 0);
          const duration = calculateJourneyDuration(journey);
          const topics = getJourneyTopics(journey);
          const enrolledCount = Array.isArray(journey.enrolledRepIds) ? journey.enrolledRepIds.length : 0;

          return (
            <div
              key={journey.id || journey._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
            >
              <div className="p-6">
                {/* Header with Icon and Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted
                      ? 'bg-green-100'
                      : isActive
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                      }`}>
                      <BookOpen className={`h-5 w-5 ${isCompleted
                        ? 'text-green-600'
                        : isActive
                          ? 'text-blue-600'
                          : 'text-gray-500'
                        }`} />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isCompleted
                      ? 'bg-green-50 text-green-700'
                      : isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-600'
                      }`}>
                      {journey.status || 'draft'}
                    </span>
                  </div>
                  {isCompleted && (
                    <div className="relative">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Journey Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {journey.title || journey.name || 'Untitled Journey'}
                </h3>

                {/* Journey Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                  {journey.description || 'No description available'}
                </p>

                {/* Journey Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {modulesCount} {modulesCount === 1 ? 'module' : 'modules'}
                    </span>
                  </div>
                  {duration > 0 && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {duration} {duration === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>
                  )}
                  {enrolledCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {enrolledCount} {enrolledCount === 1 ? 'participant' : 'participants'}
                      </span>
                    </div>
                  )}
                  {journey.gigTitle && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{journey.gigTitle}</span>
                    </div>
                  )}
                </div>

                {/* Topics Covered */}
                {topics.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Topics Covered:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {topics.slice(0, 3).map((topic, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-gray-50 text-gray-700 text-xs rounded-md border border-gray-200"
                        >
                          {topic}
                        </span>
                      ))}
                      {topics.length > 3 && (
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-md border border-gray-200">
                          +{topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${isCompleted
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    : isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  onClick={() => onJourneySelect?.(journey.id || journey._id)}
                >
                  <Play className="h-4 w-4" />
                  <span>
                    {isCompleted
                      ? 'Review'
                      : isActive
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
      {journeys.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No journey training available yet.</p>
        </div>
      )}
    </div>
  );
}

