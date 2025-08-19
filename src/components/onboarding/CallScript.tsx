import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  GitBranch,
  GitFork,
  Settings,
  Download,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const CallScript = () => {
  const [activeScript, setActiveScript] = useState<number>(1);
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);

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
      console.log('🎯 Call script data changed, checking if step should be auto-completed...');
      checkStepStatus();
    }
  }, [scripts, companyId, isStepCompleted]);

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;
      
      console.log('🔍 Checking step 8 status for company:', companyId);
      
      // Vérifier l'état de l'étape 8 via l'API d'onboarding
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/8`
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
          currentPhase: 2,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
        
        // Synchroniser avec les cookies
        Cookies.set('callScriptStepCompleted', 'true', { expires: 7 });
        
        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', { 
          detail: { 
            stepId: 8, 
            phaseId: 2, 
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
    // Check if we have at least 2 active scripts with sections
    const activeScripts = scripts.filter(script => script.status === 'active');
    const hasInfo = activeScripts.length >= 2 && activeScripts.every(script => script.sections && script.sections.length > 0);
    
    console.log('🔍 Checking basic info for CallScript:', {
      activeScripts: activeScripts.length,
      hasInfo
    });
    return hasInfo;
  };

  const handleCompleteCallScript = async () => {
    try {
      if (!companyId) {
        console.error('❌ No companyId available');
        return;
      }

      console.log('🚀 Completing call script setup...');
      
      // Marquer l'étape 8 comme complétée
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/8`,
        { status: 'completed' }
      );
      
      console.log('✅ Step 8 marked as completed:', stepResponse.data);
      
      // Mettre à jour l'état local
      setIsStepCompleted(true);
      
      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [8],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      
      // Synchroniser avec les cookies
      Cookies.set('callScriptStepCompleted', 'true', { expires: 7 });
      
      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', { 
        detail: { 
          stepId: 8, 
          phaseId: 2, 
          status: 'completed',
          completedSteps: [8]
        } 
      }));
      
      console.log('💾 Call script setup completed and step 8 marked as completed');
      
    } catch (error) {
      console.error('❌ Error completing call script setup:', error);
    }
  };

  // Initialize scripts data
  useEffect(() => {
    const initialScripts = [
      {
        id: 1,
        name: 'Product Introduction',
        description: 'Initial call script for introducing our product to potential clients',
        status: 'active',
        lastModified: '2 hours ago',
        sections: [
          {
            id: 1,
            title: 'Opening',
            content: 'Hi, this is [REP_NAME] from [COMPANY]. I noticed you recently showed interest in [PRODUCT/SERVICE]. Is this a good time to talk?',
            type: 'greeting',
            variations: 2
          },
          {
            id: 2,
            title: 'Value Proposition',
            content: 'We help companies like yours [BENEFIT_1] and [BENEFIT_2], resulting in [OUTCOME].',
            type: 'pitch',
            variations: 3
          },
          {
            id: 3,
            title: 'Qualification Questions',
            content: '1. What challenges are you currently facing with [PAIN_POINT]?\n2. How are you currently handling [PROCESS]?\n3. What would make this solution ideal for your needs?',
            type: 'questions',
            variations: 1
          }
        ]
      },
      {
        id: 2,
        name: 'Objection Handling',
        description: 'Responses to common customer objections',
        status: 'active',
        lastModified: '1 day ago',
        sections: [
          {
            id: 4,
            title: 'Price Objection',
            content: 'I understand that price is a concern. Let me explain our ROI calculation...',
            type: 'response',
            variations: 2
          }
        ]
      }
    ];
    setScripts(initialScripts);
  }, []);

  const handleScriptSelect = (scriptId: number) => {
    setActiveScript(scriptId);
    setExpandedSection(null);
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Call Script Builder</h2>
            {isStepCompleted && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">Create and manage conversation flows for your REPS</p>
        </div>
        <div className="flex space-x-3">
          <button
            className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => setShowAIHelper(!showAIHelper)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Assistant
          </button>
          {!isStepCompleted ? (
            <button
              onClick={handleCompleteCallScript}
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
            New Script
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Script List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Scripts</h3>
            <div className="space-y-3">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                    activeScript === script.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleScriptSelect(script.id)}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className={`h-5 w-5 ${
                      activeScript === script.id ? 'text-indigo-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{script.name}</p>
                      <p className="text-sm text-gray-500">{script.description}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    script.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {script.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Script Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow">
            {/* Script Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {scripts.find(s => s.id === activeScript)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Last modified {scripts.find(s => s.id === activeScript)?.lastModified}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                    <GitFork className="h-5 w-5" />
                  </button>
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                    <Settings className="h-5 w-5" />
                  </button>
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Script Sections */}
            <div className="p-6">
              <div className="space-y-4">
                {scripts
                  .find(s => s.id === activeScript)
                  ?.sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border border-gray-200"
                    >
                      <div
                        className="flex cursor-pointer items-center justify-between p-4"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <MessageSquare className="h-5 w-5 text-indigo-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">{section.title}</h4>
                            <p className="text-sm text-gray-500">
                              {section.variations} variation{section.variations !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        {expandedSection === section.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      {expandedSection === section.id && (
                        <div className="border-t border-gray-200 p-4">
                          <textarea
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            rows={4}
                            defaultValue={section.content}
                          />
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex space-x-2">
                              <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                <GitBranch className="mr-2 h-4 w-4 inline" />
                                Add Variation
                              </button>
                              <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                <Copy className="mr-2 h-4 w-4 inline" />
                                Duplicate
                              </button>
                            </div>
                            <div className="flex space-x-2">
                              <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4 inline" />
                                Delete
                              </button>
                              <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                                <Save className="mr-2 h-4 w-4 inline" />
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <button className="mt-4 flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Plus className="mr-2 h-4 w-4" />
                Add New Section
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Helper Panel */}
      {showAIHelper && (
        <div className="rounded-lg bg-indigo-50 p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-medium text-indigo-900">AI Script Suggestions</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900">Opening Improvements</h4>
                  <ul className="mt-2 space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="mr-2 mt-1 h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        Add a personalized element mentioning their industry
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="mr-2 mt-1 h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        Include a relevant market trend or statistic
                      </span>
                    </li>
                  </ul>
                  <button className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Generate Variations →
                  </button>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900">Value Proposition Enhancement</h4>
                  <ul className="mt-2 space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="mr-2 mt-1 h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        Add specific metrics or case study results
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="mr-2 mt-1 h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-gray-700">
                        Include industry-specific pain points
                      </span>
                    </li>
                  </ul>
                  <button className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Generate Variations →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Practices */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Script Writing Best Practices</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-green-100 p-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Be Natural</h4>
                <p className="text-sm text-gray-500">
                  Write conversationally and avoid robotic language
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Active Listening</h4>
                <p className="text-sm text-gray-500">
                  Include prompts for REPs to acknowledge customer responses
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Handle Objections</h4>
                <p className="text-sm text-gray-500">
                  Prepare responses for common customer concerns
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallScript;