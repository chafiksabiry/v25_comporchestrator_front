import React from 'react';
import { TrendingUp, AlertTriangle, Award, Target, Brain, Zap } from 'lucide-react';
import { AIInsight } from '../../types';

interface AIInsightsProps {
  insights: AIInsight[];
  userRole: 'trainee' | 'trainer' | 'admin';
}

export default function AIInsights({ insights, userRole }: AIInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <Brain className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'achievement':
        return <Award className="h-5 w-5 text-green-500" />;
      case 'prediction':
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      default:
        return <Zap className="h-5 w-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    const baseColors = {
      recommendation: 'border-blue-200 bg-blue-50',
      warning: 'border-amber-200 bg-amber-50',
      achievement: 'border-green-200 bg-green-50',
      prediction: 'border-purple-200 bg-purple-50',
    };

    const priorityColors = {
      critical: 'border-red-300 bg-red-50',
      high: 'border-orange-300 bg-orange-50',
    };

    if (priority === 'critical' || priority === 'high') {
      return priorityColors[priority];
    }

    return baseColors[type as keyof typeof baseColors] || 'border-gray-200 bg-gray-50';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const filteredInsights = insights.filter(insight => {
    if (userRole === 'trainee') {
      return ['recommendation', 'achievement'].includes(insight.type);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <span>AI Insights</span>
        </h2>
        <div className="text-sm text-gray-600">
          {filteredInsights.length} insights available
        </div>
      </div>

      <div className="space-y-3">
        {filteredInsights.map((insight) => (
          <div
            key={insight.id}
            className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getInsightColor(insight.type, insight.priority)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getInsightIcon(insight.type)}
                <h3 className="font-medium text-gray-900">{insight.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                {getPriorityBadge(insight.priority)}
                <div className="text-xs text-gray-500">
                  {Math.round(insight.confidence * 100)}% confidence
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3">{insight.description}</p>

            {insight.actionable && insight.suggestedActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Suggested Actions:</h4>
                <ul className="space-y-1">
                  {insight.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Target className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {new Date(insight.timestamp).toLocaleDateString()}
              </span>
              {insight.actionable && (
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Take Action
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredInsights.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No AI insights available at the moment.</p>
            <p className="text-sm">Keep engaging with your training to generate personalized insights!</p>
          </div>
        )}
      </div>
    </div>
  );
}