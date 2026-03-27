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
  ArrowRight,
  GitBranch,
  GitFork,
  Settings,
  Download,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const CallScript = ({ onBack }: { onBack?: () => void }) => {
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
      checkStepStatus();
    }
  }, [scripts, companyId, isStepCompleted]);

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;

      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`
      );

      if (response.data && (response.data as any).status === 'completed') {
        setIsStepCompleted(true);
        return;
      }

      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(6)) {
            setIsStepCompleted(true);
            return;
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }

      if (hasBasicInfo() && !isStepCompleted) {
        setIsStepCompleted(true);
        const currentCompletedSteps = [6];
        const currentProgress = {
          currentPhase: 2,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 6,
            phaseId: 2,
            status: 'completed',
            completedSteps: currentCompletedSteps
          }
        }));
      }
    } catch (error) {
      console.error('❌ Error checking step status:', error);
    }
  };

  const hasBasicInfo = () => {
    const activeScripts = scripts.filter(script => script.status === 'active');
    return activeScripts.length >= 2 && activeScripts.every(script => script.sections && script.sections.length > 0);
  };

  const handleCompleteCallScript = async () => {
    try {
      if (!companyId) return;
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
        { status: 'completed' }
      );
      setIsStepCompleted(true);
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [6],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 6,
          phaseId: 2,
          status: 'completed',
          completedSteps: [6]
        }
      }));
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
        description: 'Initial call script for introducing our product',
        status: 'active',
        lastModified: '2 hours ago',
        sections: [
          { id: 1, title: 'Opening', content: 'Hi, this is [REP_NAME] from [COMPANY]...', type: 'greeting', variations: 2 },
          { id: 2, title: 'Value Proposition', content: 'We help companies like yours [BENEFIT_1]...', type: 'pitch', variations: 3 },
          { id: 3, title: 'Qualification Questions', content: '1. What challenges are you currently facing...?', type: 'questions', variations: 1 }
        ]
      },
      {
        id: 2,
        name: 'Objection Handling',
        description: 'Responses to common customer objections',
        status: 'active',
        lastModified: '1 day ago',
        sections: [
          { id: 4, title: 'Price Objection', content: 'I understand that price is a concern...', type: 'response', variations: 2 }
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
    <div className="h-[calc(100vh-100px)] w-full flex flex-col">
      {onBack && (
        <div className="p-4 border-b border-gray-100 bg-white">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-harx-600 transition-colors group"
          >
            <ChevronDown className="h-5 w-5 rotate-90 group-hover:-translate-x-1 transition-transform" />
            Back to onboarding overview
          </button>
        </div>
      )}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
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
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Scripts</h3>
              <div className="space-y-3">
                {scripts.map((script) => (
                  <button
                    key={script.id}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${activeScript === script.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => handleScriptSelect(script.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className={`h-5 w-5 ${activeScript === script.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-900">{script.name}</p>
                        <p className="text-sm text-gray-500">{script.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {scripts.find(s => s.id === activeScript)?.name}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {scripts.find(s => s.id === activeScript)?.sections.map((section: any) => (
                    <div key={section.id} className="rounded-lg border border-gray-200">
                      <div className="flex cursor-pointer items-center justify-between p-4" onClick={() => toggleSection(section.id)}>
                        <div className="flex items-center space-x-3">
                          <MessageSquare className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-medium text-gray-900">{section.title}</h4>
                        </div>
                        {expandedSection === section.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </div>
                      {expandedSection === section.id && (
                        <div className="border-t border-gray-200 p-4">
                          <textarea className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" rows={4} defaultValue={section.content} />
                          <div className="mt-4 flex justify-end space-x-2">
                            <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50">
                              <Trash2 className="mr-2 h-4 w-4 inline" />
                              Delete
                            </button>
                            <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                              <Save className="mr-2 h-4 w-4 inline" />
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAIHelper && (
          <div className="rounded-lg bg-indigo-50 p-6">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-lg font-medium text-indigo-900">AI Script Suggestions</h3>
                <p className="mt-2 text-sm text-indigo-700">Get intelligent suggestions to improve your script performance.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallScript;