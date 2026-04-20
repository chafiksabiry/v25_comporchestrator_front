import React, { useState, useEffect } from 'react';
import { Brain, FileText, Video, Link as LinkIcon, BarChart2, TrendingUp, Search, X, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// New structured format interfaces
interface TopicAnalysis {
  summary: string;
  mainTopics: Array<{
    topic: string;
    description: string;
    relatedDocuments: Array<{
      id?: string;
      name: string;
      relevance: string;
    }>;
  }>;
}

interface KnowledgeGaps {
  summary: string;
  gaps: Array<{
    gap: string;
    impact: string;
    affectedAreas: string[];
    relatedDocuments: Array<{
      id?: string;
      name: string;
      context: string;
    }>;
  }>;
}

interface RecommendationsPriorities {
  summary: string;
  priorities: Array<{
    recommendation: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
    implementation: string;
    relatedGaps: string[];
    affectedDocuments: Array<{
      id?: string;
      name: string;
    }>;
  }>;
}

// Combined interface that can handle both formats
interface AnalysisResults {
  // New structured format
  topicAnalysis?: TopicAnalysis;
  knowledgeGaps?: KnowledgeGaps;
  recommendations?: RecommendationsPriorities | string;

  // Legacy format fields
  topics?: string;
  gaps?: string;
  relationships?: string;
}

type AnalysisStatus = 'idle' | 'started' | 'in_progress' | 'completed' | 'failed';

interface AnalysisState {
  status: AnalysisStatus;
  progress: number;
  results: AnalysisResults | null;
  error: string | null;
}

const KnowledgeInsights: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    results: null,
    error: null
  });
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Count resources by type
  const documentCount = knowledgeBase.filter(item => item.type === 'document').length;
  const videoCount = knowledgeBase.filter(item => item.type === 'video').length;
  const linkCount = knowledgeBase.filter(item => item.type === 'link').length;
  
  // Get recent resources
  const recentResources = [...knowledgeBase]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5);

  // Get companyId from JWT
  const getCompanyIdFromToken = () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      
      return null;
    }
    try {
      const decoded: any = jwtDecode(token);
      return decoded.companyId;
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  };

  // Add debounce mechanism
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests

  // Function to check analysis status
  const checkAnalysisStatus = async (companyId: string) => {
    try {
      
      const response = await apiClient.get(`/analysis/${companyId}`);
      
      if (response.data.exists && response.data.analysis) {
        const currentAnalysis = response.data.analysis;
        
        
        setAnalysis({
          status: currentAnalysis.status,
          progress: currentAnalysis.progress || 0,
          results: currentAnalysis.results || null,
          error: currentAnalysis.error || null
        });

        // If analysis is completed or failed, stop polling
        if (currentAnalysis.status === 'completed' || currentAnalysis.status === 'failed') {
          
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking analysis status:', error);
      // Don't stop polling on error, just log it
    }
  };

  // Start polling for analysis status
  const startPolling = (companyId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    
    const interval = setInterval(() => checkAnalysisStatus(companyId), 3000); // Poll every 3 seconds
    setPollingInterval(interval);
  };

  // Helper function to start new analysis
  const startNewAnalysis = async (companyId: string) => {
    try {
      // Prevent duplicate requests
      setIsRequestInProgress(true);
      
      
      // Clear any previous errors and set status to in_progress
      setAnalysis(prev => ({
        ...prev,
        error: null,
        status: 'in_progress',
        progress: 0
      }));

      const startResponse = await apiClient.post('/analysis/start', { companyId });
      

      if (!startResponse.data.success) {
        throw new Error(startResponse.data.message || 'Failed to start analysis');
      }

      // Start polling for updates
      startPolling(companyId);

      if (startResponse.data.results) {
        // If we got immediate results
        
        setAnalysis({
          status: 'completed',
          progress: 100,
          results: startResponse.data.results,
          error: null
        });
      }
      
      // Update last request time
      setLastRequestTime(Date.now());
    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      
      const errorMessage = error.response?.data?.message || error.message;
      const isRateLimit = errorMessage?.includes('429') || 
                         errorMessage?.includes('Too Many Requests');
      
      setAnalysis(prev => ({
        ...prev,
        status: 'failed',
        error: isRateLimit ? 
          'Rate limit exceeded. Please wait a few minutes before trying again.' :
          `Failed to start analysis: ${errorMessage}`
      }));
    } finally {
      setIsRequestInProgress(false);
    }get
  };

  // Fetch documents and handle analysis
  useEffect(() => {
    const fetchDataAndInitializeAnalysis = async () => {
      try {
        setLoading(true);
        const companyId = '67d18e2b319c11009f4f2a98';
        
        if (!companyId) {
          throw new Error('Company ID not found');
        }

        

        // Fetch documents first
        
        const docsResponse = await apiClient.get('/documents', {
          params: { companyId }
        });

        if (!docsResponse.data.documents) {
          throw new Error('No documents found');
        }

        const documents = docsResponse.data.documents.map((doc: any) => ({
          id: doc._id,
          name: doc.name,
          description: doc.description,
          type: doc.type || 'document',
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          uploadedBy: doc.uploadedBy,
          tags: doc.tags,
          usagePercentage: doc.usagePercentage || 0,
          isPublic: doc.isPublic
        }));

        setKnowledgeBase(documents);
        

        // Check for existing analysis
        
        const analysisResponse = await apiClient.get(`/analysis/${companyId}`);
        
        if (analysisResponse.data.exists && analysisResponse.data.analysis) {
          const existingAnalysis = analysisResponse.data.analysis;
          

          setAnalysis({
            status: existingAnalysis.status,
            progress: existingAnalysis.status === 'completed' ? 100 : existingAnalysis.progress || 0,
            results: existingAnalysis.results || null,
            error: existingAnalysis.error || null
          });

          // If analysis is in progress, start polling
          if (existingAnalysis.status === 'in_progress') {
            
            startPolling(companyId);
          }
        } else {
          // No analysis exists, check if we should auto-start one 
          
          
          // Don't auto-start analysis on initial load to prevent multiple requests
          // User can manually start analysis if needed
          setAnalysis({
            status: 'idle',
            progress: 0,
            results: null,
            error: null
          });
          
          // Set this for reference
          setLastRequestTime(Date.now() - MIN_REQUEST_INTERVAL);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error during initialization:', error);
        setError('Failed to initialize knowledge base analysis');
        setAnalysis(prev => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
        setLoading(false);
      }
    };

    fetchDataAndInitializeAnalysis();

    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Modified startAnalysis function for manual reanalysis
  const startAnalysis = async () => {
    try {
      const companyId = getCompanyIdFromToken();
      
      if (!companyId) {
        throw new Error('Company ID not found');
      }

      // Prevent duplicate requests
      if (isRequestInProgress) {
        
        return;
      }

      // Check if we're within the rate limit window
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        
        setAnalysis(prev => ({
          ...prev,
          error: `Please wait ${Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000)} seconds between analysis requests to avoid rate limits.`
        }));
        return;
      }

      
      
      // Prevent starting new analysis if one is already in progress
      if (analysis.status === 'in_progress' as const) {
        
        return;
      }

      await startNewAnalysis(companyId);
    } catch (error) {
      console.error('❌ Manual reanalysis error:', error);
      setAnalysis(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to start analysis'
      }));
    }
  };

  // Get resource icon
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={16} className="text-rose-400" />;
      case 'video':
        return <Video size={16} className="text-red-500" />;
      case 'link':
        return <LinkIcon size={16} className="text-green-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };
  
  // Get insight icon
  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'gap':
        return <Search size={20} className="text-red-500" />;
      case 'recommendation':
        return <TrendingUp size={20} className="text-green-500" />;
      case 'strength':
        return <BarChart2 size={20} className="text-rose-400" />;
      case 'weakness':
        return <Search size={20} className="text-orange-500" />;
      default:
        return <Brain size={20} className="text-purple-500" />;
    }
  };
  
  // Get insight background color
  const getInsightBgColor = (category: string) => {
    switch (category) {
      case 'gap':
        return 'bg-red-50';
      case 'recommendation':
        return 'bg-green-50';
      case 'strength':
        return 'bg-rose-50';
      case 'weakness':
        return 'bg-orange-50';
      default:
        return 'bg-purple-50';
    }
  };

  // Function to handle document view
  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  // Function to open document in new tab
  const openDocumentInNewTab = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const renderResults = () => {
    if (!analysis.results) return null;

    // Check if we have structured data or legacy format
    const hasStructuredFormat = analysis.results.topicAnalysis !== undefined || 
                               analysis.results.knowledgeGaps !== undefined || 
                               (analysis.results.recommendations !== undefined && 
                                typeof analysis.results.recommendations !== 'string');

    if (hasStructuredFormat) {
      return (
        <div className="space-y-8">
          {/* Topics Analysis */}
          {analysis.results.topicAnalysis && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Topics Analysis</h2>
              
              <div className="prose max-w-none">
                <p className="text-lg text-gray-700 mb-6">{analysis.results.topicAnalysis.summary}</p>
                
                <h3 className="text-xl font-semibold mb-3">Main Topics</h3>
                
                <div className="space-y-6">
                  {analysis.results.topicAnalysis.mainTopics.map((topic, i) => (
                    <div key={i} className="bg-rose-50 p-4 rounded-lg">
                      <h4 className="font-bold text-lg text-rose-500">{topic.topic}</h4>
                      <p className="my-2">{topic.description}</p>
                      
                      {topic.relatedDocuments.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-sm">Related Documents:</p>
                          <ul className="list-disc pl-5 mt-1">
                            {topic.relatedDocuments.map((doc, j) => (
                              <li key={j} className="text-sm">
                                <span className="font-medium">{doc.name}:</span> {doc.relevance}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Gaps */}
          {analysis.results.knowledgeGaps && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Knowledge Gaps</h2>
              
              <div className="prose max-w-none">
                <p className="text-lg text-gray-700 mb-6">{analysis.results.knowledgeGaps.summary}</p>
                
                <div className="space-y-6">
                  {analysis.results.knowledgeGaps.gaps.map((gap, i) => (
                    <div key={i} className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-bold text-lg text-red-800">{gap.gap}</h4>
                      <p className="my-2"><span className="font-medium">Impact:</span> {gap.impact}</p>
                      
                      {gap.affectedAreas.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-sm">Affected Areas:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {gap.affectedAreas.map((area, j) => (
                              <span key={j} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {gap.relatedDocuments.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-sm">Related Documents:</p>
                          <ul className="list-disc pl-5 mt-1">
                            {gap.relatedDocuments.map((doc, j) => (
                              <li key={j} className="text-sm">
                                <span className="font-medium">{doc.name}:</span> {doc.context}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.results.recommendations && typeof analysis.results.recommendations !== 'string' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
              
              <div className="prose max-w-none">
                <p className="text-lg text-gray-700 mb-6">{analysis.results.recommendations.summary}</p>
                
                <div className="space-y-6">
                  {analysis.results.recommendations.priorities.map((rec, i) => (
                    <div key={i} className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-lg text-green-800">{rec.recommendation}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-rose-100 text-rose-500'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      
                      <p className="my-2"><span className="font-medium">Rationale:</span> {rec.rationale}</p>
                      <p className="my-2"><span className="font-medium">Implementation:</span> {rec.implementation}</p>
                      
                      {rec.relatedGaps.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-sm">Related Gaps:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {rec.relatedGaps.map((gap, j) => (
                              <span key={j} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                {gap}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {rec.affectedDocuments.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-sm">Affected Documents:</p>
                          <ul className="list-disc pl-5 mt-1">
                            {rec.affectedDocuments.map((doc, j) => (
                              <li key={j} className="text-sm">
                                {doc.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Legacy format rendering
      return (
        <div className="space-y-8">
          {/* Topics Analysis */}
          {analysis.results.topics && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Topics Analysis</h2>
              <div className="prose max-w-none">
                {analysis.results.topics}
              </div>
            </div>
          )}

          {/* Knowledge Gaps */}
          {analysis.results.gaps && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Knowledge Gaps</h2>
              <div className="prose max-w-none">
                {analysis.results.gaps}
              </div>
            </div>
          )}

          {/* Relationships */}
          {analysis.results.relationships && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Document Relationships</h2>
              <div className="prose max-w-none">
                {analysis.results.relationships}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.results.recommendations && typeof analysis.results.recommendations === 'string' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
              <div className="prose max-w-none">
                {analysis.results.recommendations}
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Knowledge Insights</h1>
            <p className="text-gray-600">
              AI-generated insights about your knowledge base usage, content gaps, and recommendations
              for improving your documentation to better support contact handling.
            </p>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Resources</p>
              <p className="text-2xl font-bold">{knowledgeBase.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Brain size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Documents</p>
              <p className="text-2xl font-bold">{documentCount}</p>
            </div>
            <div className="bg-rose-100 p-3 rounded-full">
              <FileText size={24} className="text-rose-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Videos</p>
              <p className="text-2xl font-bold">{videoCount}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <Video size={24} className="text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Links</p>
              <p className="text-2xl font-bold">{linkCount}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <LinkIcon size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <Brain size={20} className="text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold">AI-Generated Insights</h2>
          </div>
          <button
            onClick={startAnalysis}
            disabled={analysis.status === ('in_progress' as AnalysisStatus) || isRequestInProgress}
            className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isRequestInProgress ? "Request in progress..." : ""}
          >
            {isRequestInProgress ? (
              <>
                <div className="animate-spin h-4 w-4 border-b-2 border-purple-700 rounded-full mr-2"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Brain size={16} />
                <span>{analysis.results ? 'Reanalyze' : 'Start Analysis'}</span>
              </>
            )}
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {analysis.status === 'in_progress' && (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="flex items-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mr-3"></div>
                <span className="text-gray-600">Analyzing knowledge base...</span>
              </div>
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${analysis.progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 mt-2">{analysis.progress}% complete</span>
            </div>
          )}
          
          {analysis.status === 'completed' && analysis.results && renderResults()}
          
          {analysis.status === 'failed' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <X size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-1">Analysis Failed</h3>
              <p className="text-red-500 max-w-md mx-auto mb-4">
                {analysis.error || 'An error occurred during analysis. Please try again.'}
              </p>
              <button
                onClick={startAnalysis}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
              >
                <Brain size={18} className="mr-2" />
                Retry Analysis
              </button>
            </div>
          )}
          
          {analysis.status === 'idle' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Brain size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No analysis available</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                Start a new analysis to get AI-generated insights about your knowledge base.
              </p>
              <button
                onClick={startAnalysis}
                className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
              >
                <Brain size={18} className="mr-2" />
                Start Analysis
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Resources */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <FileText size={20} className="text-rose-500 mr-2" />
          <h2 className="text-lg font-semibold">Recently Added Resources</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentResources.map((resource) => (
                <tr key={resource.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                        {getResourceIcon(resource.type)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{resource.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      resource.type === 'document' ? 'bg-rose-100 text-rose-500' : 
                      resource.type === 'video' ? 'bg-red-100 text-red-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(resource.uploadedAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-rose-500 h-2.5 rounded-full" 
                          style={{ width: `${resource.usagePercentage}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{resource.usagePercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleViewDocument(resource)}
                      className="text-rose-500 hover:text-rose-500"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Details Modal */}
      {isModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  {getResourceIcon(selectedDocument.type)}
                  <h3 className="text-xl font-semibold ml-2">Document Details</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{selectedDocument.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{selectedDocument.description}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900 capitalize">{selectedDocument.type}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Upload Date</label>
                  <p className="text-gray-900">
                    {format(parseISO(selectedDocument.uploadedAt), 'MMMM d, yyyy')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Usage</label>
                  <div className="flex items-center mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-rose-500 h-2.5 rounded-full" 
                        style={{ width: `${selectedDocument.usagePercentage}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedDocument.usagePercentage}%
                    </span>
                  </div>
                </div>

                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedDocument.tags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => openDocumentInNewTab(selectedDocument.fileUrl)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    <ExternalLink size={18} className="mr-2" />
                    Open Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeInsights;
