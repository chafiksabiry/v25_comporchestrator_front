import { useState, useEffect, useCallback } from 'react';
import { RealTimeService } from '../services/realTimeService';
import { TrainingService } from '../services/trainingService';

export const useRealTimeProgress = (journeyId: string) => {
  const [progressData, setProgressData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    
    // Subscribe to real-time updates
    const unsubscribe = RealTimeService.subscribeToProgress(
      journeyId,
      handleProgressUpdate
    );

    return () => {
      unsubscribe();
    };
  }, [journeyId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const analytics = await TrainingService.getJourneyAnalytics(journeyId);
      setAnalytics(analytics);
      setProgressData(analytics.progressData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setProgressData(prev => {
      switch (eventType) {
        case 'INSERT':
          return [...prev, newRecord];
        case 'UPDATE':
          return prev.map(item => 
            item.id === newRecord.id ? newRecord : item
          );
        case 'DELETE':
          return prev.filter(item => item.id !== oldRecord.id);
        default:
          return prev;
      }
    });

    // Recalculate analytics
    loadInitialData();
  }, []);

  const updateProgress = useCallback(async (
    repId: string,
    moduleId: string,
    progress: number,
    engagementScore: number = 0
  ) => {
    try {
      await TrainingService.updateProgress(repId, journeyId, moduleId, progress, engagementScore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    }
  }, [journeyId]);

  return {
    progressData,
    analytics,
    isLoading,
    error,
    updateProgress,
    refreshData: loadInitialData
  };
};