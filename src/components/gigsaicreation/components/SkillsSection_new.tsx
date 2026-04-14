import React, { useState, useEffect } from 'react';
import { InfoText } from './InfoText';
import { Languages, BookOpen, Laptop, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { 
  getLanguageOptions, 
  getLanguageNameById,
  loadSoftSkills,
  loadTechnicalSkills,
  loadProfessionalSkills,
  loadLanguages
} from '../lib/activitiesIndustries';
import { fetchProfessionalSkills } from '../lib/api';

interface SkillsSectionProps {
  data: {
    languages: Array<{
      language: string;
      proficiency: string;
      iso639_1: string;
    }>;
    soft: Array<{
      skill: { $oid: string };
      level: number;
      details: string;
    }>;
    professional: Array<{
      skill: { $oid: string };
      level: number;
      details: string;
    }>;
    technical: Array<{
      skill: { $oid: string };
      level: number;
      details: string;
    }>;
    certifications: Array<{
      name: string;
      required: boolean;
      provider?: string;
    }>;
  };
  onChange: (data: any) => void;
  errors: { [key: string]: string[] };
  onNext?: () => void;
  onPrevious?: () => void;
}

// Language levels from Suggestions.tsx
const LANGUAGE_LEVELS = [
  { value: "A1", label: "A1 - Beginner" },
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "C1", label: "C1 - Advanced" },
  { value: "C2", label: "C2 - Mastery" },
];

// Function to get header gradient based on skill type
const getHeaderGradient = (bgColor: string) => {
  switch (bgColor) {
    case 'blue':
      return 'from-blue-500 via-indigo-500 to-violet-500';
    case 'purple':
      return 'from-purple-500 via-violet-500 to-indigo-500';
    case 'emerald':
      return 'from-emerald-500 via-green-500 to-teal-500';
    case 'orange':
      return 'from-orange-500 via-amber-500 to-yellow-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export function SkillsSection({ data, onChange, errors, onNext, onPrevious }: SkillsSectionProps) {
  // API data states
  const [professionalSkills, setProfessionalSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [softSkills, setSoftSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [technicalSkills, setTechnicalSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [languages, setLanguages] = useState<Array<{ value: string; label: string; code: string }>>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);

  // States for interactive progress bars (like in Suggestions.tsx)
  const [editingSkill, setEditingSkill] = useState<{[key: string]: number | null}>({});
  const [hoveredLevel, setHoveredLevel] = useState<{[key: string]: number | null}>({});
  const [selectedLevelToAdd, setSelectedLevelToAdd] = useState<{[key: string]: number}>({});
  const [selectedExactPosition, setSelectedExactPosition] = useState<{[key: string]: number}>({});
  const [showAddSkillInterface, setShowAddSkillInterface] = useState<{[key: string]: boolean}>({});
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<{[key: string]: string}>({});

  // Ensure data is never undefined and all properties are initialized
  const safeData = {
    languages: (data?.languages || []),
    soft: (data?.soft || []),
    professional: (data?.professional || []),
    technical: (data?.technical || []),
    certifications: (data?.certifications || [])
  };

  // Load skills and languages from APIs
  useEffect(() => {
    const fetchSkillsAndLanguages = async () => {
      try {
        setLanguagesLoading(true);

        // Load languages from API first to ensure cache is populated
        await loadLanguages();
        const languageOptions = getLanguageOptions();
        setLanguages(languageOptions);
        setLanguagesLoading(false);

        // Load all professional skills from API
        try {
          const { data: professionalSkillsData, error: professionalError } = await fetchProfessionalSkills();
          if (professionalError) {
            console.warn('⚠️ Could not load professional skills:', professionalError);
          } else {
            console.log('📚 Loaded professional skills:', professionalSkillsData);
            setProfessionalSkills(professionalSkillsData || []);
          }
        } catch (error) {
          console.warn('⚠️ Error loading professional skills:', error);
        }

        // Load soft skills from API
        const softSkillsData = await loadSoftSkills();
        setSoftSkills(softSkillsData);

        // Load technical skills from API
        const technicalSkillsData = await loadTechnicalSkills();
        setTechnicalSkills(technicalSkillsData);
      } catch (error) {
        console.error('Error fetching skills and languages:', error);
        setLanguagesLoading(false);
      }
    };

    fetchSkillsAndLanguages();
  }, []);

  // Helper: get ObjectId for a skill name and type (from Suggestions.tsx)
  function getSkillObjectId(skillName: string, type: string): string | undefined {
    let arr: any[] = [];
    if (type === 'soft') arr = softSkills;
    if (type === 'professional') arr = professionalSkills;
    if (type === 'technical') arr = technicalSkills;
    const found = arr.find(s => s.name === skillName);
    return found?._id;
  }

  const addSkill = (skillType: string, skill: string, level: number = 1, exactPosition?: number) => {
    const newData = { ...safeData };

    switch (skillType) {
      case "languages":
        // Find the language by ID to get the code
        const selectedLanguage = languages.find(l => l.value === skill);
        if (selectedLanguage) {
          const newLanguage: any = {
            language: selectedLanguage.value, // Store ID
            proficiency: LANGUAGE_LEVELS[level]?.value || "B1", // level est maintenant l'index
            iso639_1: selectedLanguage.code, // Use correct code
          };
          // Ajouter la position exacte si fournie
          if (exactPosition !== undefined) {
            newLanguage.exactPosition = exactPosition;
          }
          newData.languages.push(newLanguage);
        } else {
          console.warn(`Language with ID "${skill}" not found. Skipping addition.`);
          return; // Exit early without adding the skill
        }
        break;
      case "soft":
      case "professional":
      case "technical":
        // For skills, we need to find the skill object to get the ObjectId
        let skillArray: Array<{_id: string, name: string, description: string, category: string}>;
        switch (skillType) {
          case "soft":
            skillArray = softSkills;
            break;
          case "professional":
            skillArray = professionalSkills;
            break;
          case "technical":
            skillArray = technicalSkills;
            break;
          default:
            skillArray = [];
        }
        
        // Find the skill by ObjectId (skill parameter is now the ObjectId)
        const skillObject = skillArray.find(s => s._id === skill);
        
        if (skillObject) {
          const skillData: any = { 
            skill: { $oid: skillObject._id }, // Store MongoDB ObjectId format
            level,
            details: skillObject.description || '' // Add details field
          };
          // Ajouter la position exacte si fournie
          if (exactPosition !== undefined) {
            skillData.exactPosition = exactPosition;
          }
          (newData as any)[skillType].push(skillData);
        } else {
          // Don't add skills that don't exist in the database
          return; // Exit early without adding the skill
        }
        break;
    }
    
    onChange(newData);
  };

  const updateSkill = (skillType: string, index: number, field: string, value: string | number, exactPosition?: number) => {
    const newData = { ...safeData };

    switch (skillType) {
      case "languages":
        if (field === "language") {
          // Find the language by ID to get the code
          const selectedLanguage = languages.find(l => l.value === value);
          if (selectedLanguage) {
            newData.languages[index].language = selectedLanguage.value; // Store ID
            newData.languages[index].iso639_1 = selectedLanguage.code; // Update code
          } else {
            console.warn(`Language with ID "${value}" not found. Skipping update.`);
            return;
          }
        } else if (field === "proficiency") {
          newData.languages[index].proficiency = value as string;
          // Stocker la position exacte si fournie
          if (exactPosition !== undefined) {
            (newData.languages[index] as any).exactPosition = exactPosition;
          }
        }
        break;
      case "soft":
      case "professional":
      case "technical":
        if (field === "skill") {
          // For skills, we need to find the skill object to get the ObjectId
          let skillArray: Array<{_id: string, name: string, description: string, category: string}>;
          switch (skillType) {
            case "soft":
              skillArray = softSkills;
              break;
            case "professional":
              skillArray = professionalSkills;
              break;
            case "technical":
              skillArray = technicalSkills;
              break;
            default:
              skillArray = [];
          }
          
          // Find the skill by ObjectId (value parameter is now the ObjectId)
          const skillObject = skillArray.find(s => s._id === value);
          
          if (skillObject) {
            (newData as any)[skillType][index].skill = { $oid: skillObject._id }; // Store MongoDB ObjectId format
            (newData as any)[skillType][index].details = skillObject.description || ''; // Update details field
          } else {
            // Don't update with skills that don't exist in the database
            return; // Exit early without updating the skill
          }
        } else if (field === "level") {
          (newData as any)[skillType][index].level = value as number;
          // Stocker la position exacte si fournie
          if (exactPosition !== undefined) {
            ((newData as any)[skillType][index] as any).exactPosition = exactPosition;
          }
        }
        break;
    }
    onChange(newData);
  };

  const deleteSkill = (skillType: string, index: number) => {
    const newData = { ...safeData };
    switch (skillType) {
      case "languages":
        newData.languages.splice(index, 1);
        break;
      case "soft":
        newData.soft.splice(index, 1);
        break;
      case "professional":
        newData.professional.splice(index, 1);
        break;
      case "technical":
        newData.technical.splice(index, 1);
        break;
    }
    onChange(newData);
  };

  const renderSkillCard = (skillType: string, items: any[], title: string, icon: React.ReactNode) => {
    const currentItems = items || [];

    const handleShowAddInterface = () => {
      setShowAddSkillInterface(prev => ({ ...prev, [skillType]: true }));
    };

    const getLevelLabel = (level: number, type: string) => {
      if (type === "languages") {
        const labels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced', 'Proficient'];
        return labels[level] || 'Intermediate';
      } else {
        const labels = ['', 'Basic', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
        return labels[level] || 'Basic';
      }
    };

    const getSkillOptions = () => {
      switch (skillType) {
        case "languages":
          return languages
            .filter(lang => !currentItems.some(item => item.language === lang.value))
            .map(lang => ({ id: lang.value, name: lang.label }));
        case "professional":
          return professionalSkills
            .filter(skill => !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
            }))
            .map(skill => ({ id: skill._id, name: skill.name }));
        case "technical":
          return technicalSkills
            .filter(skill => !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
            }))
            .map(skill => ({ id: skill._id, name: skill.name }));
        case "soft":
          return softSkills
            .filter(skill => !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
            }))
            .map(skill => ({ id: skill._id, name: skill.name }));
        default:
          return [];
      }
    };

    const skillOptions = getSkillOptions();

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className={`bg-gradient-to-r ${getHeaderGradient(skillType === 'languages' ? 'blue' : skillType === 'professional' ? 'purple' : skillType === 'technical' ? 'emerald' : 'orange')} px-6 py-4`}>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
              {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 text-white" })}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-white/80 text-sm">
                {skillType === 'languages' ? 'Specify required languages and proficiency levels' :
                 skillType === 'professional' ? 'Add required professional and industry-specific skills' :
                 skillType === 'technical' ? 'Specify required technical tools and software proficiency' :
                 'Add interpersonal and communication skills'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentItems.map((item: any, index: number) => {
              // Get skill name
              let skillName = '';
              let currentPercentage = 0;
              let levelName = '';
              
              if (skillType === 'languages') {
                const language = languages.find(l => l.value === item.language);
                skillName = language?.label || 'Unknown Language';
                const levelIndex = LANGUAGE_LEVELS.findIndex(l => l.value === item.proficiency);
                currentPercentage = item.exactPosition || ((levelIndex + 1) / LANGUAGE_LEVELS.length) * 100;
                levelName = LANGUAGE_LEVELS[levelIndex]?.label.split(' - ')[1] || 'Elementary';
              } else {
                const skillId = typeof item.skill === 'string' ? item.skill : (item.skill?.$oid || '');
                let skillArray: any[] = [];
                if (skillType === 'professional') skillArray = professionalSkills;
                else if (skillType === 'technical') skillArray = technicalSkills;
                else if (skillType === 'soft') skillArray = softSkills;
                
                const skill = skillArray.find(s => s._id === skillId);
                skillName = skill?.name || 'Unknown Skill';
                currentPercentage = item.exactPosition || (item.level / 5) * 100;
                levelName = getLevelLabel(item.level, skillType);
              }

              return (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Skill Name */}
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {skillName}
                    </div>

                    {/* Progress Bar */}
                    <div className="relative">
                      <div 
                        className="h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = (clickX / rect.width) * 100;
                          const clampedPercentage = Math.max(0, Math.min(100, percentage));
                          
                          if (skillType === 'languages') {
                            const levelIndex = Math.floor((clampedPercentage / 100) * LANGUAGE_LEVELS.length);
                            const level = Math.min(levelIndex, LANGUAGE_LEVELS.length - 1);
                            updateSkill(skillType, index, 'proficiency', LANGUAGE_LEVELS[level].value, clampedPercentage);
                          } else {
                            const level = Math.ceil((clampedPercentage / 100) * 5);
                            updateSkill(skillType, index, 'level', Math.max(1, level), clampedPercentage);
                          }
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const hoverX = e.clientX - rect.left;
                          const percentage = (hoverX / rect.width) * 100;
                          const clampedPercentage = Math.max(0, Math.min(100, percentage));
                          setHoveredLevel(prev => ({ ...prev, [skillType + '_' + index]: clampedPercentage }));
                        }}
                        onMouseLeave={() => {
                          setHoveredLevel(prev => ({ ...prev, [skillType + '_' + index]: null }));
                        }}
                      >
                        <div 
                          className={`h-full transition-all duration-200 ${
                            skillType === 'languages' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            skillType === 'professional' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            skillType === 'technical' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                            'bg-gradient-to-r from-orange-400 to-orange-600'
                          }`}
                          style={{ 
                            width: `${hoveredLevel[skillType + '_' + index] !== null ? hoveredLevel[skillType + '_' + index] : currentPercentage}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Level Name */}
                    <div className="text-xs font-medium text-gray-600 text-right">
                      {hoveredLevel[skillType + '_' + index] !== null ? (
                        skillType === 'languages' ? (
                          (() => {
                            const hoverPercentage = hoveredLevel[skillType + '_' + index] || 0;
                            const levelIndex = Math.floor((hoverPercentage / 100) * LANGUAGE_LEVELS.length);
                            const level = Math.min(levelIndex, LANGUAGE_LEVELS.length - 1);
                            return LANGUAGE_LEVELS[level]?.label.split(' - ')[1] || 'Elementary';
                          })()
                        ) : (
                          (() => {
                            const hoverPercentage = hoveredLevel[skillType + '_' + index] || 0;
                            const level = Math.ceil((hoverPercentage / 100) * 5);
                            return getLevelLabel(Math.max(1, level), skillType);
                          })()
                        )
                      ) : (
                        <span className="flex items-center gap-1">
                          {levelName}
                          <button
                            onClick={() => deleteSkill(skillType, index)}
                            className="ml-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove skill"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Skill Interface */}
            {showAddSkillInterface[skillType] && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Skill Selection */}
                  <div>
                    <select
                      value={selectedSkillToAdd[skillType] || ''}
                      onChange={(e) => {
                        setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: e.target.value }));
                        if (e.target.value) {
                          // Auto-add skill immediately after selection
                          const exactPos = selectedExactPosition[skillType] || (skillType === 'languages' ? 50 : 60);
                          addSkill(skillType, e.target.value, selectedLevelToAdd[skillType] || (skillType === 'languages' ? 2 : 3), exactPos);
                          
                          // Reset states
                          setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
                          setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
                          setSelectedExactPosition(prev => ({ ...prev, [skillType]: undefined }));
                        }
                      }}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select {skillType === 'languages' ? 'language' : 'skill'}...</option>
                      {skillOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Progress Bar for Level Selection */}
                  <div className="relative">
                    <div 
                      className="h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = (clickX / rect.width) * 100;
                        const clampedPercentage = Math.max(0, Math.min(100, percentage));
                        
                        if (skillType === 'languages') {
                          const levelIndex = Math.floor((clampedPercentage / 100) * LANGUAGE_LEVELS.length);
                          const level = Math.min(levelIndex, LANGUAGE_LEVELS.length - 1);
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: level }));
                        } else {
                          const level = Math.ceil((clampedPercentage / 100) * 5);
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: Math.max(1, level) }));
                        }
                        setSelectedExactPosition(prev => ({ ...prev, [skillType]: clampedPercentage }));
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const hoverX = e.clientX - rect.left;
                        const percentage = (hoverX / rect.width) * 100;
                        const clampedPercentage = Math.max(0, Math.min(100, percentage));
                        setHoveredLevel(prev => ({ ...prev, [skillType + '_add']: clampedPercentage }));
                      }}
                      onMouseLeave={() => {
                        setHoveredLevel(prev => ({ ...prev, [skillType + '_add']: null }));
                      }}
                    >
                      <div 
                        className={`h-full transition-all duration-200 ${
                          skillType === 'languages' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                          skillType === 'professional' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          skillType === 'technical' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                          'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}
                        style={{ 
                          width: `${hoveredLevel[skillType + '_add'] !== null ? hoveredLevel[skillType + '_add'] : 
                            selectedExactPosition[skillType] || (skillType === 'languages' ? 50 : 60)}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Level Display */}
                  <div className="text-xs font-medium text-blue-600 text-right">
                    {hoveredLevel[skillType + '_add'] !== null ? (
                      skillType === 'languages' ? (
                        (() => {
                          const hoverPercentage = hoveredLevel[skillType + '_add'] || 0;
                          const levelIndex = Math.floor((hoverPercentage / 100) * LANGUAGE_LEVELS.length);
                          const level = Math.min(levelIndex, LANGUAGE_LEVELS.length - 1);
                          return LANGUAGE_LEVELS[level]?.label.split(' - ')[1] || 'Elementary';
                        })()
                      ) : (
                        (() => {
                          const hoverPercentage = hoveredLevel[skillType + '_add'] || 0;
                          const level = Math.ceil((hoverPercentage / 100) * 5);
                          return getLevelLabel(Math.max(1, level), skillType);
                        })()
                      )
                    ) : (
                      skillType === 'languages' ? 'Intermediate' : 'Intermediate'
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add Button */}
          {!showAddSkillInterface[skillType] && (
            <button
              onClick={handleShowAddInterface}
              className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium"
            >
              + Add {title.slice(0, -1)}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white p-0">
      <div className="space-y-8">
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl shadow-sm border border-slate-100">
          <InfoText>
            Define all required skills for the role, including languages, technical tools, and soft skills.
            Be specific about proficiency levels where applicable.
          </InfoText>

          <div className="grid grid-cols-1 gap-8">
            {/* Languages */}
            {renderSkillCard(
              'languages',
              safeData.languages,
              'Languages',
              <Languages className="w-5 h-5 text-blue-600" />
            )}

            {/* Professional Skills */}
            {renderSkillCard(
              'professional',
              safeData.professional,
              'Professional Skills',
              <BookOpen className="w-5 h-5 text-purple-600" />
            )}

            {/* Technical Skills */}
            {renderSkillCard(
              'technical',
              safeData.technical,
              'Technical Skills',
              <Laptop className="w-5 h-5 text-emerald-600" />
            )}

            {/* Soft Skills */}
            {renderSkillCard(
              'soft',
              safeData.soft,
              'Soft Skills',
              <Users className="w-5 h-5 text-orange-600" />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={onPrevious}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>
            </div>
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
