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
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Share2,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const KnowledgeBase = ({ onBack }: { onBack?: () => void }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('product');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  const companyId = Cookies.get('companyId');

  // Define API URL with fallback
  const API_BASE_URL = import.meta.env.VITE_COMPANY_API_URL;

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

      console.log('🔍 Checking step 8 status for company:', companyId);

      // Vérifier l'état de l'étape 8 via l'API d'onboarding
      const response = await axios.get(
        `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`
      );

      console.log('📡 API response for step 8:', response.data);

      if (response.data && (response.data as any).status === 'completed') {
        console.log('✅ Step 8 is already completed according to API');
        setIsStepCompleted(true);
        return;
      }

      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(8)) {
            console.log('✅ Step 8 found in localStorage, setting as completed');
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
        console.log('🎯 Auto-completing step 8 locally because basic info is present');

        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);

        // Mettre à jour le localStorage avec l'étape 8 marquée comme complétée
        const currentCompletedSteps = [8];
        const currentProgress = {
          currentPhase: 3,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

        // Synchroniser avec les cookies
        Cookies.set('knowledgeBaseStepCompleted', 'true', { expires: 7 });

        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 8,
            phaseId: 3,
            status: 'completed',
            completedSteps: currentCompletedSteps
          }
        }));

        console.log('💾 Step 8 marked as completed locally and parent component notified');
      }

    } catch (error) {
      console.error('❌ Error checking step status:', error);

      // En cas d'erreur API, vérifier le localStorage
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(8)) {
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

      // Marquer l'étape 8 comme complétée
      const stepResponse = await axios.put(
        `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding/phases/3/steps/8`,
        { status: 'completed' }
      );

      console.log('✅ Step 8 marked as completed:', stepResponse.data);

      // Mettre à jour l'état local
      setIsStepCompleted(true);

      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 3,
        completedSteps: [8],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Synchroniser avec les cookies
      Cookies.set('knowledgeBaseStepCompleted', 'true', { expires: 7 });

      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 8,
          phaseId: 3,
          status: 'completed',
          completedSteps: [8]
        }
      }));

      console.log('💾 Knowledge base setup completed and step 8 marked as completed');

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
    <div className="w-full py-4 space-y-6 animate-in fade-in duration-500">
      {/* Header Area - Branded Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-8 mb-4 shadow-lg shadow-harx-500/20">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-6">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-xl group shrink-0"
                >
                  <ChevronDown className="h-6 w-6 rotate-90 group-hover:-translate-x-1 transition-transform" />
                </button>
              )}
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  Knowledge Base
                  {isStepCompleted && (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-100 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-500/30 backdrop-blur-md italic">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to Scale
                    </span>
                  )}
                </h2>
                <p className="text-[16px] font-medium text-white/90">Equip your REPS with essential product wisdom and objection handlers.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 relative z-10">
            <button className="flex items-center rounded-2xl bg-white/10 backdrop-blur-md px-6 py-3 text-sm font-black text-white shadow-sm border border-white/20 hover:bg-white/20 transition-all">
              <FolderPlus className="mr-2 h-4 w-4" />
              New Section
            </button>
            {!isStepCompleted ? (
              <button
                onClick={handleCompleteKnowledgeBase}
                className={`flex items-center rounded-2xl px-6 py-3 text-sm font-black text-white shadow-lg transition-all transform active:scale-95 ${hasBasicInfo() ? 'bg-white text-harx-600 hover:scale-105' : 'bg-white/10 text-white/50 cursor-not-allowed shadow-none border border-white/10'}`}
                disabled={!hasBasicInfo()}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalize Setup
              </button>
            ) : (
              <button className="flex items-center rounded-2xl bg-emerald-500/20 text-emerald-100 px-6 py-3 text-sm font-black border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-500/20 cursor-default opacity-80 italic">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Validated
              </button>
            )}
            <button className="flex items-center rounded-2xl bg-gray-900 px-6 py-3 text-sm font-black text-white shadow-xl hover:bg-black transition-all transform hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </button>
          </div>
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-harx-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full h-14 rounded-2xl bg-white border-2 border-gray-100 pl-12 pr-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-medium transition-all shadow-sm"
            placeholder="Search training modules, objections, scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="h-14 rounded-2xl bg-white border-2 border-gray-100 px-6 text-sm font-black text-gray-700 focus:border-harx-500 focus:outline-none focus:ring-0 shadow-sm transition-all cursor-pointer">
          <option>All Knowledge Pillars</option>
          <option>Product Deep-Dives</option>
          <option>Objection Handling</option>
          <option>FAQ Library</option>
        </select>
      </div>

      {/* Knowledge Base Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.id} className={`rounded-[2rem] bg-white border-2 transition-all overflow-hidden ${expandedSection === section.id ? 'border-harx-200 shadow-xl' : 'border-gray-50 shadow-sm hover:border-harx-100 hover:shadow-md'}`}>
            <div
              className={`flex cursor-pointer items-center justify-between p-6 transition-colors ${expandedSection === section.id ? 'bg-harx-50/30' : 'hover:bg-gray-50/50'}`}
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center space-x-4">
                <div className={`rounded-2xl p-3 transition-all ${expandedSection === section.id ? 'bg-gradient-harx text-white scale-110 shadow-lg shadow-harx-500/20' : 'bg-harx-50 text-harx-600'}`}>
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{section.title}</h3>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{section.articles.length} Knowledge Assets</p>
                </div>
              </div>
              <div className={`p-2 rounded-xl transition-all ${expandedSection === section.id ? 'bg-white text-harx-500 rotate-180 shadow-sm' : 'text-gray-400 group-hover:text-gray-600'}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>

            {expandedSection === section.id && (
              <div className="border-t border-gray-100 bg-white">
                <div className="divide-y divide-gray-50">
                  {section.articles.map((article) => (
                    <div
                      key={article.id}
                      className="group p-6 hover:bg-gray-50/80 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="mt-1 w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-white group-hover:text-harx-500 group-hover:shadow-sm transition-all border border-transparent group-hover:border-harx-100">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 group-hover:text-harx-600 transition-colors">{article.title}</h4>
                            <p className="mt-1 text-sm text-gray-500 font-medium leading-relaxed">
                              {article.content.substring(0, 120)}...
                            </p>
                            <div className="mt-4 flex items-center gap-6">
                              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Updated {article.lastUpdated}</span>
                              <span
                                className={`inline-flex items-center rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${article.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                                  }`}
                              >
                                {article.status === 'published' ? (
                                  <CheckCircle className="mr-1.5 h-3 w-3" />
                                ) : (
                                  <AlertCircle className="mr-1.5 h-3 w-3" />
                                )}
                                {article.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <button className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-harx-500 hover:border-harx-500 shadow-sm hover:shadow-md transition-all">
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-harx-500 hover:border-harx-500 shadow-sm hover:shadow-md transition-all">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-500 shadow-sm hover:shadow-md transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-gray-50/50">
                  <button className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-black text-gray-500 hover:border-harx-300 hover:text-harx-600 transition-all shadow-sm hover:shadow-md uppercase tracking-widest italic group">
                    <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                    Expand {section.title}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pro Tips Section */}
      <div className="rounded-[2.5rem] bg-gray-900 p-10 overflow-hidden relative border-4 border-harx-500/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-harx-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white tracking-tight mb-8">HARX Strategic Insights</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 italic">
            <div className="rounded-3xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-harx-500/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Dynamic Updates</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Live markets shift. Keep your content rolling with weekly refinement of objection handling.
              </p>
            </div>
            
            <div className="rounded-3xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-harx-500/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-harx-500/20 text-harx-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Human-Centric</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Don't just list facts. Craft narratives. REPS convert better with stories than specs.
              </p>
            </div>
            
            <div className="rounded-3xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-harx-500/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Share2 className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Accessible Flow</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Organize by "Moment of Need". The easier it is to find, the faster the close.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;