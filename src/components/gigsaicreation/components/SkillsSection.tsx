import React, { useState, useEffect } from 'react';
import { InfoText } from './InfoText';
import { Languages, BookOpen, Laptop, Users, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { 
  getLanguageOptions, 
  loadSoftSkills,
  loadTechnicalSkills,
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


export function SkillsSection({ data, onChange, onNext, onPrevious }: SkillsSectionProps) {
  // API data states
  const [professionalSkills, setProfessionalSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [softSkills, setSoftSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [technicalSkills, setTechnicalSkills] = useState<Array<{_id: string, name: string, description: string, category: string}>>([]);
  const [languages, setLanguages] = useState<Array<{ value: string; label: string; code: string }>>([]);

  // States for interactive progress bars (like in Suggestions.tsx)
  const [hoveredExistingLevel, setHoveredExistingLevel] = useState<{[key: string]: {[index: number]: number | null}}>({
    professional: {},
    technical: {},
    soft: {},
    languages: {}
  });
  const [hoveredLevel, setHoveredLevel] = useState<{[key: string]: number | null}>({
    languages: null,
    professional: null,
    technical: null,
    soft: null
  });
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

        // Load languages from API first to ensure cache is populated
        await loadLanguages();
        const languageOptions = getLanguageOptions();
        setLanguages(languageOptions);

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
      }
    };

    fetchSkillsAndLanguages();
  }, []);


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
        const labels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced', 'Mastery'];
        return labels[level] || 'Intermediate';
      } else {
        // Fix: Use same skill level labels as Suggestions.tsx for consistency
        const labels = ['', 'Basic', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
        // Ensure we have a valid level (1-5)
        const validLevel = Math.max(1, Math.min(5, level || 1));
        // Debug only for actual skill rendering, not hover calculations
        if (level !== 1) {
          console.log(`getLevelLabel: level=${level}, validLevel=${validLevel}, label=${labels[validLevel]}`);
        }
        return labels[validLevel] || 'Basic';
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
      <div className="space-y-4">
        {/* Header with title and + button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className="text-sm text-gray-500">
              {skillOptions.length} available
            </span>
          </div>
          {!showAddSkillInterface[skillType] && (
            <button
              onClick={handleShowAddInterface}
              className={`w-8 h-8 rounded-full ${
                skillType === 'professional' ? 'bg-harx-500 hover:bg-harx-600' : 
                skillType === 'technical' ? 'bg-harx-alt-500 hover:bg-harx-alt-600' : 
                skillType === 'languages' ? 'bg-harx-500 hover:bg-harx-600' : 
                'bg-harx-alt-500 hover:bg-harx-alt-600'
              } text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center group`}
              title={`Add ${skillType === "languages" ? "language" : "skill"}`}
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
        
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
                const validLevelIndex = levelIndex >= 0 ? levelIndex : 1; // Default to A2 if not found
                
                // Use exact position if available, otherwise calculate from level
                const exactPosition = item.exactPosition;
                if (exactPosition !== undefined) {
                  currentPercentage = exactPosition;
                } else {
                  currentPercentage = ((validLevelIndex + 1) / 6) * 100;
                }
                
                levelName = LANGUAGE_LEVELS[validLevelIndex]?.label.split(' - ')[1] || 'Elementary';
                
                // Debug: Log actual language data structure
                console.log(`Language data:`, item);
                console.log(`Calculated: proficiency=${item.proficiency}, levelIndex=${validLevelIndex}, percentage=${currentPercentage}%, name=${skillName}`);
                    } else {
                // Extract the actual string ID from the skill object
                let skillId = '';
                if (typeof item.skill === 'string') {
                  skillId = item.skill;
                } else if (typeof item.skill === 'object' && item.skill) {
                  // Handle various MongoDB ObjectId formats
                  if (item.skill.$oid) {
                    if (typeof item.skill.$oid === 'string') {
                      // Direct string: { $oid: 'id_string' }
                      skillId = item.skill.$oid;
                    } else if (typeof item.skill.$oid === 'object' && item.skill.$oid.$oid) {
                      // Nested object: { $oid: { $oid: 'id_string' } }
                      skillId = item.skill.$oid.$oid;
                    } else if (typeof item.skill.$oid === 'object') {
                      // Try to find any string property that looks like an ID
                      const keys = Object.keys(item.skill.$oid);
                      for (const key of keys) {
                        const value = item.skill.$oid[key];
                        if (typeof value === 'string' && value.length > 10) {
                          skillId = value;
                          break;
                        }
                      }
                    }
                  } else if (item.skill._id) {
                    skillId = item.skill._id;
                  } else if (item.skill.id) {
                    skillId = item.skill.id;
                  } else if (item.skill.toString) {
                    // Fallback to toString if available
                    skillId = item.skill.toString();
                  }
                }
                
                // Additional debugging for skill ID extraction
                console.log(`Skill ID extraction debug:`);
                console.log(`- item.skill:`, item.skill);
                console.log(`- item.skill.$oid:`, item.skill?.$oid);
                console.log(`- item.skill.$oid.$oid:`, item.skill?.$oid?.$oid);
                console.log(`- item.skill.$oid type:`, typeof item.skill?.$oid);
                console.log(`- item.skill.$oid keys:`, item.skill?.$oid ? Object.keys(item.skill.$oid) : 'N/A');
                console.log(`- item.skill.$oid.$oid type:`, typeof item.skill?.$oid?.$oid);
                
                // Let's try a more direct approach to extract the ID
                if (!skillId && item.skill?.$oid) {
                  // Try to access the $oid property directly
                  if (typeof item.skill.$oid === 'string') {
                    skillId = item.skill.$oid;
                    console.log(`Direct string extraction:`, skillId);
                  } else if (typeof item.skill.$oid === 'object' && item.skill.$oid.$oid) {
                    skillId = item.skill.$oid.$oid;
                    console.log(`Nested $oid extraction:`, skillId);
                  } else if (typeof item.skill.$oid === 'object') {
                    // Try to find any string property that looks like an ID
                    const keys = Object.keys(item.skill.$oid);
                    console.log(`Available keys in $oid object:`, keys);
                    for (const key of keys) {
                      const value = item.skill.$oid[key];
                      console.log(`Checking key '${key}':`, value, typeof value);
                      if (typeof value === 'string' && value.length > 10) {
                        skillId = value;
                        console.log(`Found ID in key '${key}':`, skillId);
                        break;
                      }
                    }
                  }
                }
                
                console.log(`- Final skillId:`, skillId);
                let skillArray: any[] = [];
                if (skillType === 'professional') skillArray = professionalSkills;
                else if (skillType === 'technical') skillArray = technicalSkills;
                else if (skillType === 'soft') skillArray = softSkills;
                
                const skill = skillArray.find(s => s._id === skillId);
                skillName = skill?.name || 'Unknown Skill';
                const validLevel = item.level && item.level >= 1 && item.level <= 5 ? item.level : 4; // Default to level 4 (Advanced) for better display
                
                // Use exact position if available, otherwise calculate from level
                const exactPosition = item.exactPosition;
                if (exactPosition !== undefined) {
                  currentPercentage = exactPosition;
                } else {
                  currentPercentage = (validLevel / 5) * 100;
                }
                
                levelName = getLevelLabel(validLevel, skillType);
                
                // Debug: Log actual data structure
                console.log(`${skillType} skill data:`, item);
                console.log(`Raw skill object:`, item.skill);
                console.log(`item.skill type:`, typeof item.skill);
                console.log(`item.skill.$oid:`, item.skill?.$oid);
                console.log(`item.skill.$oid type:`, typeof item.skill?.$oid);
                console.log(`item.skill.$oid.$oid:`, item.skill?.$oid?.$oid);
                console.log(`Extracted skillId:`, skillId);
                console.log(`Extracted skillId type:`, typeof skillId);
                console.log(`Calculated: level=${validLevel}, percentage=${currentPercentage}%, name=${skillName}`);
                console.log(`Available ${skillType} skills:`, skillArray.length);
                console.log(`Looking for skill ID: ${skillId}`);
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
                        className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = (clickX / rect.width) * 100;
                          const clampedPercentage = Math.max(0, Math.min(100, percentage));
                          
                          if (skillType === 'languages') {
                            // Determine level based on zones but keep exact position
                            let levelIndex = 0; // A1
                            if (clampedPercentage >= 83.33) levelIndex = 5; // C2
                            else if (clampedPercentage >= 66.67) levelIndex = 4; // C1
                            else if (clampedPercentage >= 50) levelIndex = 3; // B2
                            else if (clampedPercentage >= 33.33) levelIndex = 2; // B1
                            else if (clampedPercentage >= 16.67) levelIndex = 1; // A2
                            else levelIndex = 0; // A1
                            
                            updateSkill(skillType, index, 'proficiency', LANGUAGE_LEVELS[levelIndex].value, clampedPercentage);
                          } else {
                            // 5 zones: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                            let level = 1; // Basic
                            if (clampedPercentage >= 80) level = 5; // Expert
                            else if (clampedPercentage >= 60) level = 4; // Advanced
                            else if (clampedPercentage >= 40) level = 3; // Intermediate
                            else if (clampedPercentage >= 20) level = 2; // Novice
                            else level = 1; // Basic
                            
                            updateSkill(skillType, index, 'level', level, clampedPercentage);
                          }
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const hoverX = e.clientX - rect.left;
                          const percentage = (hoverX / rect.width) * 100;
                          const clampedPercentage = Math.max(0, Math.min(100, percentage));
                          setHoveredExistingLevel(prev => ({ 
                            ...prev, 
                            [skillType]: { ...prev[skillType], [index]: clampedPercentage }
                          }));
                        }}
                        onMouseLeave={() => {
                          setHoveredExistingLevel(prev => ({ 
                            ...prev, 
                            [skillType]: { ...prev[skillType], [index]: null }
                          }));
                        }}
                      >
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(() => {
                              const hoveredLevel = hoveredExistingLevel[skillType][index];
                              if (hoveredLevel !== null && hoveredLevel !== undefined) {
                                return hoveredLevel;
                              }
                              return currentPercentage;
                            })()}%`,
                            background: (() => {
                              const hoveredLevel = hoveredExistingLevel[skillType][index];
                              const percentage = (hoveredLevel !== null && hoveredLevel !== undefined) ? hoveredLevel : currentPercentage;
                              
                              // Use same gradient logic as Suggestions.tsx
                              if (skillType === 'professional') {
                                // HARX red gradient
                                return `linear-gradient(90deg, #fff1f1 0%, #ffe4e4 ${percentage * 0.2}%, #fecaca ${percentage * 0.4}%, #fea3a3 ${percentage * 0.6}%, #ff7c7c ${percentage * 0.8}%, #ff4d4d ${percentage}%, #cc3d3d 100%)`;
                              } else if (skillType === 'technical') {
                                // HARX pink gradient
                                return `linear-gradient(90deg, #fdf2f8 0%, #fce7f3 ${percentage * 0.2}%, #fbcfe8 ${percentage * 0.4}%, #f9a8d4 ${percentage * 0.6}%, #f472b6 ${percentage * 0.8}%, #ec4899 ${percentage}%, #be185d 100%)`;
                              } else if (skillType === 'languages') {
                                // HARX red-to-pink gradient
                                return `linear-gradient(90deg, #fff1f1 0%, #ffe4e4 ${percentage * 0.2}%, #fecaca ${percentage * 0.4}%, #ec4899 ${percentage * 0.6}%, #db2777 ${percentage * 0.8}%, #be185d ${percentage}%, #9d174d 100%)`;
                              } else {
                                // HARX pink-to-red gradient
                                return `linear-gradient(90deg, #fdf2f8 0%, #fbcfe8 ${percentage * 0.2}%, #f9a8d4 ${percentage * 0.4}%, #ff4d4d ${percentage * 0.6}%, #ef4444 ${percentage * 0.8}%, #dc2626 ${percentage}%, #b91c1c 100%)`;
                              }
                            })()
                          }}
                        />
                      </div>
                    </div>

                    {/* Level Name */}
                    <div className="text-xs font-medium text-gray-600 text-right">
                      {hoveredExistingLevel[skillType][index] !== null && hoveredExistingLevel[skillType][index] !== undefined ? (
                        skillType === 'languages' ? (
                          (() => {
                            const hoverPercentage = hoveredExistingLevel[skillType][index] || 0;
                            const levelIndex = Math.floor((hoverPercentage / 100) * LANGUAGE_LEVELS.length);
                            const level = Math.min(levelIndex, LANGUAGE_LEVELS.length - 1);
                            return LANGUAGE_LEVELS[level]?.label.split(' - ')[1] || 'Elementary';
                          })()
                        ) : (
                          (() => {
                            const hoverPercentage = hoveredExistingLevel[skillType][index];
                            if (hoverPercentage !== null && hoverPercentage !== undefined) {
                              const level = Math.max(1, Math.ceil((hoverPercentage / 100) * 5));
                              return getLevelLabel(level, skillType);
                            }
                            return levelName; // Use the already calculated levelName instead of calling getLevelLabel again
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
              <div className="bg-gradient-to-br from-harx-50 to-harx-alt-50 border-2 border-harx-100 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Skill Selection */}
                  <div>
            <select
                      value={selectedSkillToAdd[skillType] || ''}
                      onChange={(e) => {
                        setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: e.target.value }));
                        if (e.target.value) {
                          // Auto-add skill immediately after selection
                          const exactPos = selectedExactPosition[skillType] || (skillType === 'languages' ? 83 : 80); // 83% = C1 level for languages, 80% = level 4 for skills
                          addSkill(skillType, e.target.value, selectedLevelToAdd[skillType] || (skillType === 'languages' ? 4 : 4), exactPos);
                          
                          // Reset states
                          setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
                          setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
                          setSelectedExactPosition(prev => {
                            const newState = { ...prev };
                            delete newState[skillType];
                            return newState;
                          });
                        }
                      }}
                      className="w-full px-2 py-1 text-xs border border-harx-300 rounded-md focus:outline-none focus:ring-2 focus:ring-harx-500"
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
                      className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = (clickX / rect.width) * 100;
                        const clampedPercentage = Math.max(0, Math.min(100, percentage));
                        
                        // Store exact position
                        setSelectedExactPosition(prev => ({ ...prev, [skillType]: clampedPercentage }));
                        
                        if (skillType === 'languages') {
                          // 6 zones: 0-16.67%, 16.67-33.33%, 33.33-50%, 50-66.67%, 66.67-83.33%, 83.33-100%
                          let levelIndex = 0; // A1
                          if (clampedPercentage >= 83.33) levelIndex = 5; // C2
                          else if (clampedPercentage >= 66.67) levelIndex = 4; // C1
                          else if (clampedPercentage >= 50) levelIndex = 3; // B2
                          else if (clampedPercentage >= 33.33) levelIndex = 2; // B1
                          else if (clampedPercentage >= 16.67) levelIndex = 1; // A2
                          else levelIndex = 0; // A1
                          
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: levelIndex }));
                        } else {
                          // 5 zones: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                          let level = 1; // Basic
                          if (clampedPercentage >= 80) level = 5; // Expert
                          else if (clampedPercentage >= 60) level = 4; // Advanced
                          else if (clampedPercentage >= 40) level = 3; // Intermediate
                          else if (clampedPercentage >= 20) level = 2; // Novice
                          else level = 1; // Basic
                          
                          setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: level }));
                        }
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
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${hoveredLevel[skillType + '_add'] !== null ? hoveredLevel[skillType + '_add'] : 
                            selectedExactPosition[skillType] || (skillType === 'languages' ? 83 : 80)}%`,
                          background: (() => {
                            const percentage = (hoveredLevel[skillType + '_add'] ?? selectedExactPosition[skillType] ?? (skillType === 'languages' ? 83 : 80));
                            
                            // Use same gradient logic as Suggestions.tsx
                            if (skillType === 'professional') {
                              // HARX red gradient
                              return `linear-gradient(90deg, #fff1f1 0%, #ffe4e4 ${percentage * 0.2}%, #fecaca ${percentage * 0.4}%, #fea3a3 ${percentage * 0.6}%, #ff7c7c ${percentage * 0.8}%, #ff4d4d ${percentage}%, #cc3d3d 100%)`;
                            } else if (skillType === 'technical') {
                              // HARX pink gradient
                              return `linear-gradient(90deg, #fdf2f8 0%, #fce7f3 ${percentage * 0.2}%, #fbcfe8 ${percentage * 0.4}%, #f9a8d4 ${percentage * 0.6}%, #f472b6 ${percentage * 0.8}%, #ec4899 ${percentage}%, #be185d 100%)`;
                            } else if (skillType === 'languages') {
                              // HARX red-to-pink gradient
                              return `linear-gradient(90deg, #fff1f1 0%, #ffe4e4 ${percentage * 0.2}%, #fecaca ${percentage * 0.4}%, #ec4899 ${percentage * 0.6}%, #db2777 ${percentage * 0.8}%, #be185d ${percentage}%, #9d174d 100%)`;
                            } else {
                              // HARX pink-to-red gradient
                              return `linear-gradient(90deg, #fdf2f8 0%, #fbcfe8 ${percentage * 0.2}%, #f9a8d4 ${percentage * 0.4}%, #ff4d4d ${percentage * 0.6}%, #ef4444 ${percentage * 0.8}%, #dc2626 ${percentage}%, #b91c1c 100%)`;
                            }
                          })()
                        }}
                      />
          </div>
                  </div>

                  {/* Level Display */}
                  <div className="text-xs font-medium text-harx-600 text-right">
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
                          const level = Math.max(1, Math.ceil((hoverPercentage / 100) * 5));
                          return getLevelLabel(level, skillType);
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
              <Languages className="w-5 h-5 text-harx-500" />
            )}

            {/* Professional Skills */}
            {renderSkillCard(
              'professional',
              safeData.professional,
              'Professional Skills',
              <BookOpen className="w-5 h-5 text-harx-500" />
            )}

            {/* Technical Skills */}
            {renderSkillCard(
              'technical',
              safeData.technical,
              'Technical Skills',
              <Laptop className="w-5 h-5 text-purple-500" />
            )}

            {/* Soft Skills */}
            {renderSkillCard(
              'soft',
              safeData.soft,
              'Soft Skills',
              <Users className="w-5 h-5 text-orange-500" />
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
