import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Share2,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const KnowledgeBase = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('product');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  const companyId = Cookies.get('companyId');

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      checkStepStatus();
    }
  }, [companyId]);

  // Vérifier l'état de l'étape quand les données changent
  useEffect(() => {
    if (companyId && hasBasicInfo() && !isStepCompleted) {
      console.log('🎯 Knowledge base data changed, checking if step should be auto-completed...');
      checkStepStatus();
    }
  }, [articles, companyId, isStepCompleted]);

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;
      
      console.log('🔍 Checking step 7 status for company:', companyId);
      
      // Vérifier l'état de l'étape 7 via l'API d'onboarding
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/7`
      );
      
      console.log('📡 API response for step 7:', response.data);
      
      if (response.data && (response.data as any).status === 'completed') {
        console.log('✅ Step 7 is already completed according to API');
        setIsStepCompleted(true);
        return;
      }
      
      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(7)) {
            console.log('✅ Step 7 found in localStorage, setting as completed');
            setIsStepCompleted(true);
            return;
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }
      
      // Si l'étape n'est pas marquée comme complétée mais que les informations de base sont présentes,
      // marquer automatiquement l'étape comme complétée localement
      if (hasBasicInfo() && !isStepCompleted) {
        console.log('🎯 Auto-completing step 7 locally because basic info is present');
        
        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);
        
        // Mettre à jour le localStorage avec l'étape 7 marquée comme complétée
        const currentCompletedSteps = [7];
        const currentProgress = {
          currentPhase: 2,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
        
        // Synchroniser avec les cookies
        Cookies.set('knowledgeBaseStepCompleted', 'true', { expires: 7 });
        
        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', { 
          detail: { 
            stepId: 7, 
            phaseId: 2, 
            status: 'completed',
            completedSteps: currentCompletedSteps
          } 
        }));
        
        console.log('💾 Step 7 marked as completed locally and parent component notified');
      }
      
    } catch (error) {
      console.error('❌ Error checking step status:', error);
      
      // En cas d'erreur API, vérifier le localStorage
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(7)) {
            setIsStepCompleted(true);
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }
    }
  };

  const hasBasicInfo = () => {
    // Check if we have at least 3 published articles across different sections
    const publishedArticles = sections.flatMap(section => 
      section.articles.filter(article => article.status === 'published')
    );
    const hasInfo = publishedArticles.length >= 3;
    
    console.log('🔍 Checking basic info for KnowledgeBase:', {
      publishedArticles: publishedArticles.length,
      hasInfo
    });
    return hasInfo;
  };

  const handleCompleteKnowledgeBase = async () => {
    try {
      if (!companyId) {
        console.error('❌ No companyId available');
        return;
      }

      console.log('🚀 Completing knowledge base setup...');
      
      // Marquer l'étape 7 comme complétée
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/7`,
        { status: 'completed' }
      );
      
      console.log('✅ Step 7 marked as completed:', stepResponse.data);
      
      // Mettre à jour l'état local
      setIsStepCompleted(true);
      
      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [7],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      
      // Synchroniser avec les cookies
      Cookies.set('knowledgeBaseStepCompleted', 'true', { expires: 7 });
      
      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', { 
        detail: { 
          stepId: 7, 
          phaseId: 2, 
          status: 'completed',
          completedSteps: [7]
        } 
      }));
      
      console.log('💾 Knowledge base setup completed and step 7 marked as completed');
      
    } catch (error) {
      console.error('❌ Error completing knowledge base setup:', error);
    }
  };

  const sections = [
    {
      id: 'product',
      title: 'Product Information',
      articles: [
        {
          id: 1,
          title: 'Product Overview',
          content: 'Comprehensive overview of our product features and benefits...',
          lastUpdated: '2 days ago',
          status: 'published'
        },
        {
          id: 2,
          title: 'Technical Specifications',
          content: 'Detailed technical specifications and requirements...',
          lastUpdated: '1 week ago',
          status: 'draft'
        }
      ]
    },
    {
      id: 'objections',
      title: 'Common Objections',
      articles: [
        {
          id: 3,
          title: 'Price Concerns',
          content: 'How to handle pricing objections and demonstrate value...',
          lastUpdated: '3 days ago',
          status: 'published'
        },
        {
          id: 4,
          title: 'Competition Comparison',
          content: 'Key differentiators from competitors...',
          lastUpdated: '5 days ago',
          status: 'published'
        }
      ]
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      articles: [
        {
          id: 5,
          title: 'General FAQs',
          content: 'Common questions about our services...',
          lastUpdated: '1 day ago',
          status: 'published'
        },
        {
          id: 6,
          title: 'Technical FAQs',
          content: 'Technical support and troubleshooting questions...',
          lastUpdated: '4 days ago',
          status: 'published'
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
            {isStepCompleted && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">Create and manage training materials for REPS</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Section
          </button>
          {!isStepCompleted ? (
            <button
              onClick={handleCompleteKnowledgeBase}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
              disabled={!hasBasicInfo()}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Setup
            </button>
          ) : (
            <button className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm cursor-not-allowed">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Setup Completed
            </button>
          )}
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <select className="rounded-lg border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500">
          <option>All Categories</option>
          <option>Product Information</option>
          <option>Common Objections</option>
          <option>FAQs</option>
        </select>
      </div>

      {/* Knowledge Base Content */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg bg-white shadow">
            <div
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.articles.length} articles</p>
                </div>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>

            {expandedSection === section.id && (
              <div className="border-t border-gray-200">
                {section.articles.map((article) => (
                  <div
                    key={article.id}
                    className="border-b border-gray-200 p-4 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <FileText className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">{article.title}</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {article.content.substring(0, 100)}...
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Last updated {article.lastUpdated}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                article.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {article.status === 'published' ? (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <AlertCircle className="mr-1 h-3 w-3" />
                              )}
                              {article.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 p-4">
                  <button className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Article to {section.title}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="rounded-lg bg-indigo-50 p-6">
        <h3 className="text-lg font-medium text-indigo-900">Knowledge Base Best Practices</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-green-100 p-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Keep It Updated</h4>
                <p className="text-sm text-gray-500">
                  Regularly review and update content to ensure accuracy
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Clear Communication</h4>
                <p className="text-sm text-gray-500">
                  Use simple language and provide examples
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Easy Access</h4>
                <p className="text-sm text-gray-500">
                  Organize content logically for quick reference
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;