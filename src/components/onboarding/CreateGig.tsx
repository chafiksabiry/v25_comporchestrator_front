import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Clock,
  DollarSign,
  Globe,
  MessageSquare,
  Phone,
  Mail,
  Video,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Settings,
  Save,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const CreateGig = () => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['voice']);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [gigTitle, setGigTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [technicalRequirements, setTechnicalRequirements] = useState('');

  const companyId = Cookies.get('companyId');

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      checkStepStatus();
    }
  }, [companyId]);

  // Vérifier l'état de l'étape quand les données du formulaire changent
  useEffect(() => {
    if (companyId && hasBasicInfo() && !isStepCompleted) {
      console.log('🎯 Form data changed, checking if step should be auto-completed...');
      checkStepStatus();
    }
  }, [gigTitle, department, jobDescription, companyId, isStepCompleted]);

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;

      console.log('🔍 Checking step 4 status for company:', companyId);

      // Vérifier l'état de l'étape 4 via l'API d'onboarding
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`
      );

      console.log('📡 API response for step 4:', response.data);

      if (response.data && (response.data as any).status === 'completed') {
        console.log('✅ Step 4 is already completed according to API');
        setIsStepCompleted(true);
        return;
      }

      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(4)) {
            console.log('✅ Step 4 found in localStorage, setting as completed');
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
        console.log('🎯 Auto-completing step 4 locally because basic info is present');

        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);

        // Mettre à jour le localStorage avec l'étape 4 marquée comme complétée
        const currentCompletedSteps = [4];
        const currentProgress = {
          currentPhase: 2,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

        // Synchroniser avec les cookies
        Cookies.set('createGigStepCompleted', 'true', { expires: 7 });

        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 4,
            phaseId: 2,
            status: 'completed',
            completedSteps: currentCompletedSteps
          }
        }));

        console.log('💾 Step 4 marked as completed locally and parent component notified');
      }

    } catch (error) {
      console.error('❌ Error checking step status:', error);

      // En cas d'erreur API, vérifier le localStorage
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(4)) {
            setIsStepCompleted(true);
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }
    }
  };

  const hasBasicInfo = () => {
    const hasInfo = gigTitle && department && jobDescription;
    console.log('🔍 Checking basic info for CreateGig:', {
      gigTitle,
      department,
      jobDescription,
      hasInfo
    });
    return hasInfo;
  };

  const handlePublishGig = async () => {
    try {
      if (!companyId) {
        console.error('❌ No companyId available');
        return;
      }

      console.log('🚀 Publishing gig...');

      // Marquer l'étape 4 comme complétée
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`,
        { status: 'completed' }
      );

      console.log('✅ Step 4 marked as completed:', stepResponse.data);

      // Mettre à jour l'état local
      setIsStepCompleted(true);

      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [4],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Synchroniser avec les cookies
      Cookies.set('createGigStepCompleted', 'true', { expires: 7 });

      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 4,
          phaseId: 2,
          status: 'completed',
          completedSteps: [4]
        }
      }));

      console.log('💾 Gig published and step 4 marked as completed');

    } catch (error) {
      console.error('❌ Error publishing gig:', error);
    }
  };

  const channels = [
    { id: 'voice', name: 'Voice Calls', icon: Phone },
    { id: 'chat', name: 'Live Chat', icon: MessageSquare },
    { id: 'email', name: 'Email Support', icon: Mail },
    { id: 'video', name: 'Video Calls', icon: Video },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'youtube', name: 'YouTube', icon: Youtube }
  ];

  const toggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      setSelectedChannels(selectedChannels.filter(id => id !== channelId));
    } else {
      setSelectedChannels([...selectedChannels, channelId]);
    }
  };

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Create Multi-Channel Gig</h2>
            {isStepCompleted && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">Define requirements and specifications for your gig</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={isStepCompleted ? undefined : handlePublishGig}
            className={`flex items-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${isStepCompleted
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            disabled={isStepCompleted}
          >
            {isStepCompleted ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Gig Already Published
              </span>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Publish Gig
              </>
            )}
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Gig Title</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., Customer Support Representative"
              value={gigTitle}
              onChange={(e) => setGigTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option>Customer Support</option>
              <option>Sales</option>
              <option>Technical Support</option>
              <option>Account Management</option>
            </select>
          </div>
        </div>
      </div>

      {/* Channel Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Communication Channels</h3>
        <p className="mt-1 text-sm text-gray-500">Select the channels this gig will handle</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);

            return (
              <div
                key={channel.id}
                className={`cursor-pointer rounded-lg border p-4 ${isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                  }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`rounded-lg p-2 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-900">{channel.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Requirements</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Experience Level</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>Entry Level (0-2 years)</option>
              <option>Intermediate (2-5 years)</option>
              <option>Senior (5+ years)</option>
              <option>Expert (8+ years)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Education</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>High School Diploma</option>
              <option>Bachelor's Degree</option>
              <option>Master's Degree</option>
              <option>Any Level</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Languages</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>English Only</option>
              <option>English + Spanish</option>
              <option>English + French</option>
              <option>Multiple Languages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>Remote - Any Location</option>
              <option>United States Only</option>
              <option>Europe Only</option>
              <option>Asia Pacific Only</option>
            </select>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Required Skills</label>
          <div className="mt-2">
            <div className="flex space-x-2">
              <input
                type="text"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add a skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <button
                onClick={addSkill}
                className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-200 hover:text-indigo-500 focus:bg-indigo-500 focus:text-white focus:outline-none"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule & Availability */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Schedule & Availability</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Work Schedule</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>Full Time (40 hours/week)</option>
              <option>Part Time (20-30 hours/week)</option>
              <option>Flexible Hours</option>
              <option>Custom Schedule</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Time Zone Coverage</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>EST (UTC-5)</option>
              <option>PST (UTC-8)</option>
              <option>GMT (UTC+0)</option>
              <option>Multiple Time Zones</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shift Preference</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>Day Shift</option>
              <option>Night Shift</option>
              <option>Rotating Shifts</option>
              <option>Weekend Coverage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Compensation</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pay Range</label>
            <div className="mt-1 flex space-x-4">
              <div className="flex-1">
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Min"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pay Period</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option>Per Hour</option>
              <option>Per Day</option>
              <option>Per Week</option>
              <option>Per Month</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Benefits</label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">Health Insurance</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">Paid Time Off</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">Performance Bonuses</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">Professional Development</label>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Job Description</label>
          <textarea
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Describe the role, responsibilities, and expectations..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Technical Requirements</label>
          <textarea
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="List any specific technical requirements or equipment needed..."
            value={technicalRequirements}
            onChange={(e) => setTechnicalRequirements(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateGig;