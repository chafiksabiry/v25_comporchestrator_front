import { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Video,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  CheckCircle2,
  DollarSign,
  Calendar
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

      console.log('🔍 Checking step 3 status for company:', companyId);

      // Vérifier l'état de l'étape 3 via l'API d'onboarding
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/3`
      );

      console.log('📡 API response for step 3:', response.data);

      if (response.data && (response.data as any).status === 'completed') {
        console.log('✅ Step 3 is already completed according to API');
        setIsStepCompleted(true);
        return;
      }

      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(3)) {
            console.log('✅ Step 3 found in localStorage, setting as completed');
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
        console.log('🎯 Auto-completing step 3 locally because basic info is present');

        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);

        // Mettre à jour le localStorage avec l'étape 3 marquée comme complétée
        const currentCompletedSteps = [3];
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
            stepId: 3,
            phaseId: 2,
            status: 'completed',
            completedSteps: currentCompletedSteps
          }
        }));

        console.log('💾 Step 3 marked as completed locally and parent component notified');
      }

    } catch (error) {
      console.error('❌ Error checking step status:', error);

      // En cas d'erreur API, vérifier le localStorage
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(3)) {
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

      // Marquer l'étape 3 comme complétée
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/3`,
        { status: 'completed' }
      );

      console.log('✅ Step 3 marked as completed:', stepResponse.data);

      // Mettre à jour l'état local
      setIsStepCompleted(true);

      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 2,
        completedSteps: [3],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Synchroniser avec les cookies
      Cookies.set('createGigStepCompleted', 'true', { expires: 7 });

      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 3,
          phaseId: 2,
          status: 'completed',
          completedSteps: [3]
        }
      }));

      console.log('💾 Gig published and step 3 marked as completed');

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
    <div className="w-full py-2 space-y-4 animate-in fade-in duration-500">
      {/* Header Area - Branded Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 mb-3 shadow-lg shadow-harx-500/20">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                    Create Multi-Channel Gig
                  </h2>
                  {isStepCompleted && (
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </div>
                  )}
                </div>
                <p className="text-[14px] font-medium text-white/90">Define requirements and specifications for your gig</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-black rounded-2xl shadow-xl border border-white/20 transition-all duration-200 uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={isStepCompleted ? undefined : handlePublishGig}
              className={`px-6 py-2.5 font-black rounded-2xl shadow-xl transition-all duration-200 uppercase tracking-widest text-[10px] flex items-center gap-2 ${isStepCompleted
                ? 'bg-emerald-600/50 text-white/50 cursor-not-allowed border border-white/10'
                : 'bg-white text-harx-600 hover:bg-gray-50 border border-white shadow-harx-500/25 hover:shadow-harx-500/40'
                }`}
              disabled={isStepCompleted}
            >
              {isStepCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Published
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Publish Gig
                </>
              )}
            </button>
          </div>
        </div>
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>

      {/* Basic Information */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Base Intelligence</h3>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Gig Title</label>
            <input
              type="text"
              className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all"
              placeholder="e.g., Customer Support Specialist"
              value={gigTitle}
              onChange={(e) => setGigTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Department</label>
            <select
              className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer"
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
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Communication Channels</h3>
        <p className="text-sm font-medium text-gray-500 mb-8 tracking-tight">Select the multi-channel capabilities for this specific gig execution.</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);

            return (
              <div
                key={channel.id}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 transform hover:-translate-y-1 ${isSelected
                  ? 'border-harx-500 bg-white shadow-xl shadow-harx-500/10'
                  : 'border-white/60 bg-white/40 hover:bg-white hover:border-harx-200'
                  }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`rounded-xl p-3 transition-colors ${isSelected 
                    ? 'bg-gradient-harx text-white shadow-md' 
                    : 'bg-gray-100 text-gray-400'
                    }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {channel.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Role Requirements</h3>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Experience Level</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>Entry Level (0-2 years)</option>
              <option>Intermediate (2-5 years)</option>
              <option>Senior (5+ years)</option>
              <option>Expert (8+ years)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Education</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>High School Diploma</option>
              <option>Bachelor's Degree</option>
              <option>Master's Degree</option>
              <option>Any Level</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Languages</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>English Only</option>
              <option>English + Spanish</option>
              <option>English + French</option>
              <option>Multiple Languages</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Location</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>Remote - Any Location</option>
              <option>United States Only</option>
              <option>Europe Only</option>
              <option>Asia Pacific Only</option>
            </select>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block">Required Skills</label>
          <div className="mt-2">
            <div className="flex space-x-3">
              <input
                type="text"
                className="block w-full h-12 rounded-xl bg-gray-50 border-2 border-transparent px-4 focus:bg-white focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all"
                placeholder="Add a power skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <button
                onClick={addSkill}
                className="flex items-center justify-center rounded-xl bg-harx-500 px-5 text-white shadow-lg shadow-harx-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5 font-black" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 rounded-xl bg-harx-50 px-4 py-2 text-xs font-black text-harx-700 border border-harx-100 shadow-sm transition-all hover:bg-harx-100"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="flex h-5 w-5 items-center justify-center rounded-lg text-harx-400 hover:bg-harx-500 hover:text-white transition-all shadow-inner"
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
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Schedule & Availability</h3>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Work Schedule</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>Full Time (40 hours/week)</option>
              <option>Part Time (20-30 hours/week)</option>
              <option>Flexible Hours</option>
              <option>Custom Schedule</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Time Zone Coverage</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>EST (UTC-5)</option>
              <option>PST (UTC-8)</option>
              <option>GMT (UTC+0)</option>
              <option>Multiple Time Zones</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Shift Preference</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>Day Shift</option>
              <option>Night Shift</option>
              <option>Rotating Shifts</option>
              <option>Weekend Coverage</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Start Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-harx-400" />
              </div>
              <input
                type="date"
                className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 pl-11 pr-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Compensation & Benefits</h3>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Pay Range</label>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-harx-400" />
                </div>
                <input
                  type="text"
                  className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 pl-10 pr-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all"
                  placeholder="Min"
                />
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-harx-400" />
                </div>
                <input
                  type="text"
                  className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 pl-10 pr-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Pay Period</label>
            <select className="block w-full h-12 rounded-xl bg-white border-2 border-gray-100 px-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-bold tracking-tight transition-all cursor-pointer">
              <option>Per Hour</option>
              <option>Per Day</option>
              <option>Per Week</option>
              <option>Per Month</option>
            </select>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-100">
          <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block">Perks & Benefits</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'health', label: 'Health Insurance' },
              { id: 'pto', label: 'Paid Time Off' },
              { id: 'bonus', label: 'Performance Bonuses' },
              { id: 'dev', label: 'Professional Development' }
            ].map(benefit => (
              <label key={benefit.id} className="flex items-center p-3 rounded-xl bg-gray-50 border border-transparent hover:border-harx-200 transition-all cursor-pointer group">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-harx-500 focus:ring-harx-500 transition-all cursor-pointer"
                />
                <span className="ml-3 text-xs font-black text-gray-600 uppercase tracking-tight group-hover:text-harx-600">{benefit.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-xl p-8">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Strategic Context</h3>
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Job Description</label>
            <textarea
              rows={4}
              className="block w-full rounded-xl bg-white border-2 border-gray-100 p-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-medium tracking-tight transition-all resize-none"
              placeholder="Describe the role, responsibilities, and expectations..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Technical Requirements</label>
            <textarea
              rows={4}
              className="block w-full rounded-xl bg-white border-2 border-gray-100 p-4 focus:border-harx-500 focus:ring-0 text-gray-900 font-medium tracking-tight transition-all resize-none"
              placeholder="List any specific technical requirements or equipment needed..."
              value={technicalRequirements}
              onChange={(e) => setTechnicalRequirements(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGig;