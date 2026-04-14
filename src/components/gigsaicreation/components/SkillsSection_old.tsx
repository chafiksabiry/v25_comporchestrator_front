import React, { useState, useEffect } from 'react';
import { InfoText } from './InfoText';
import { Languages, BookOpen, Laptop, Users, ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
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
      skill: { $oid: string }; // MongoDB ObjectId format for mongoose.Types.ObjectId
      level: number;
      details: string; // Added details field to match backend
    }>;
    professional: Array<{
      skill: { $oid: string }; // MongoDB ObjectId format for mongoose.Types.ObjectId
      level: number;
      details: string; // Added details field to match backend
    }>;
    technical: Array<{
      skill: { $oid: string }; // MongoDB ObjectId format for mongoose.Types.ObjectId
      level: number;
      details: string; // Added details field to match backend
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

// Skill levels from Suggestions.tsx
const SKILL_LEVELS = [
  { value: 1, label: "Basic" },
  { value: 2, label: "Intermediate" },
  { value: 3, label: "Advanced" },
  { value: 4, label: "Expert" },
  { value: 5, label: "Master" },
];



// Skills will be loaded from APIs

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
  const [loadingSkills, setLoadingSkills] = useState({
    professional: false,
    soft: false,
    technical: false
  });
  const [errorSkills, setErrorSkills] = useState({
    professional: false,
    soft: false,
    technical: false
  });

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
        setLoadingSkills(prev => ({ ...prev, professional: true }));
        setErrorSkills(prev => ({ ...prev, professional: false }));
        try {
          const { data: professionalSkillsData, error: professionalError } = await fetchProfessionalSkills();
          if (professionalError) {
            console.warn('⚠️ Could not load professional skills:', professionalError);
            setErrorSkills(prev => ({ ...prev, professional: true }));
          } else {
            console.log('📚 Loaded professional skills:', professionalSkillsData);
            setProfessionalSkills(professionalSkillsData || []);
          }
        } catch (error) {
          console.warn('⚠️ Error loading professional skills:', error);
          setErrorSkills(prev => ({ ...prev, professional: true }));
        }
        setLoadingSkills(prev => ({ ...prev, professional: false }));

        // Load soft skills from API
        setLoadingSkills(prev => ({ ...prev, soft: true }));
        setErrorSkills(prev => ({ ...prev, soft: false }));
        const softSkillsData = await loadSoftSkills();
        setSoftSkills(softSkillsData);
        setLoadingSkills(prev => ({ ...prev, soft: false }));

        // Load technical skills from API
        setLoadingSkills(prev => ({ ...prev, technical: true }));
        setErrorSkills(prev => ({ ...prev, technical: false }));
        const technicalSkillsData = await loadTechnicalSkills();
        setTechnicalSkills(technicalSkillsData);
        setLoadingSkills(prev => ({ ...prev, technical: false }));
      } catch (error) {
        console.error('Error fetching skills and languages:', error);
        setLanguagesLoading(false);
        setLoadingSkills({ professional: false, soft: false, technical: false });
        setErrorSkills({ professional: true, soft: true, technical: true });
      }
    };

    fetchSkillsAndLanguages();
  }, []);

  // Migrate skills and languages when data is loaded
  useEffect(() => {
    if (!languagesLoading && languages.length > 0) {
      migrateSkillsToObjectIds();
    }
  }, [languagesLoading, languages.length]);

  // Migrate skills and languages to ObjectId format if needed
  const migrateSkillsToObjectIds = () => {
    let needsUpdate = false;
    const migratedData = { ...safeData };
    
    // Migrate languages if needed
    if (migratedData.languages && Array.isArray(migratedData.languages)) {
      const migratedLanguages = migratedData.languages.map((lang: any) => {
        // If language is stored as name instead of ID, convert it
        if (lang.language && typeof lang.language === 'string') {
          const foundLanguage = languages.find(l => l.label === lang.language);
          if (foundLanguage) {
            needsUpdate = true;
            return {
              ...lang,
              language: foundLanguage.value, // Store the ID
              iso639_1: foundLanguage.code
            };
          }
        }
        return lang;
      });
      migratedData.languages = migratedLanguages;
    }
    
    ['soft', 'professional', 'technical'].forEach(type => {
      const skillArray = migratedData[type as keyof typeof migratedData];
      if (skillArray && Array.isArray(skillArray)) {
        const migratedSkills = skillArray.map((skill: any) => {
          // Helper function to find skill by name
          const findSkillByName = (skillName: string, skillType: string) => {
            let found;
            
            if (skillType === 'soft') {
              found = softSkills.find(s => s.name === skillName);
              if (!found) {
                found = softSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
              }
              if (!found) {
                found = softSkills.find(s => 
                  s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                  skillName.toLowerCase().includes(s.name.toLowerCase())
                );
              }
            } else if (skillType === 'professional') {
              found = professionalSkills.find(s => s.name === skillName);
              if (!found) {
                found = professionalSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
              }
              if (!found) {
                found = professionalSkills.find(s => 
                  s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                  skillName.toLowerCase().includes(s.name.toLowerCase())
                );
              }
            } else if (skillType === 'technical') {
              found = technicalSkills.find(s => s.name === skillName);
              if (!found) {
                found = technicalSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
              }
              if (!found) {
                found = technicalSkills.find(s => 
                  s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                  skillName.toLowerCase().includes(s.name.toLowerCase())
                );
              }
            }
            
            return found;
          };

          // If skill is a string, convert to ObjectId format
          if (typeof skill === 'string') {
            const foundSkill = findSkillByName(skill, type);
            if (foundSkill) {
              needsUpdate = true;
              return { 
                skill: { $oid: foundSkill._id }, 
                level: 1,
                details: foundSkill.description || 'Migrated from string'
              };
            } else {
              return null; // Remove skills that don't exist in database
            }
          }
          
          // If skill.skill is a string, convert to ObjectId format
          if (skill && typeof skill.skill === 'string') {
            const foundSkill = findSkillByName(skill.skill, type);
            if (foundSkill) {
              needsUpdate = true;
              return { 
                ...skill, 
                skill: { $oid: foundSkill._id },
                details: skill.details || foundSkill.description || 'Migrated from string'
              };
            } else {
              return null; // Remove skills that don't exist in database
            }
          }
          
          return skill;
        }).filter(Boolean); // Remove null entries
        (migratedData as any)[type] = migratedSkills;
      }
    });
    
    if (needsUpdate) {
      onChange(migratedData);
    }
  };

  // Run migration when component mounts or when skills are loaded
  useEffect(() => {
    if (professionalSkills.length > 0 || softSkills.length > 0 || technicalSkills.length > 0) {
      migrateSkillsToObjectIds();
    }
  }, [professionalSkills, softSkills, technicalSkills]);

  // Log Skills Section data
  React.useEffect(() => {
    // This effect is now just for cleanup and monitoring
  }, [safeData, errors, professionalSkills, softSkills, technicalSkills]);

  // State for editing
  const [editingIndex, setEditingIndex] = useState<{ type: string; index: number } | null>(null);
  const [newSkill, setNewSkill] = useState({ language: '', proficiency: '', iso639_1: '', level: 1 });
  const [addMode, setAddMode] = useState<{ type: string; active: boolean }>({ type: '', active: false });

  // Language options from API
  const languageOptions = languages.map((lang: { value: string; label: string; code: string }) => {
    return {
      language: lang.label,
      iso639_1: lang.code
    };
  });

  // Function to get level label
  const getLevelLabel = (level: number) => {
    const option = SKILL_LEVELS.find(opt => opt.value === level);
    return option ? option.label : 'Unknown';
  };

  const getLanguageLevelLabel = (proficiency: string) => {
    const option = LANGUAGE_LEVELS.find(opt => opt.value === proficiency);
    return option ? option.label : proficiency;
  };

  // Prevent duplicate skills
  const isDuplicate = (name: string, type: string, excludeIndex?: number) => {
    const skills = safeData[type as keyof typeof safeData];
    return skills.some((s: any, i: number) => {
      if (excludeIndex !== undefined && i === excludeIndex) return false;
      if (type === 'languages') {
        // For languages, compare by language ID
        return s.language === name;
      } else {
        // For skills, handle both ObjectId format and string format
        let skillId = null;
        
        if (typeof s === 'string') {
          // Handle case where skill is still a string (not yet migrated)
          skillId = s;
        } else if (typeof s === 'object' && s !== null && 'skill' in s) {
          if (typeof s.skill === 'string') {
            // Handle case where skill.skill is still a string (not yet migrated)
            skillId = s.skill;
          } else if (typeof s.skill === 'object' && s.skill.$oid) {
            // Handle ObjectId format
            skillId = s.skill.$oid;
          }
        }
        
        return skillId === name;
      }
    });
  };

  // Handlers
  const handleEdit = (type: string, idx: number) => {
    setEditingIndex({ type, index: idx });
    const skill = safeData[type as keyof typeof safeData][idx];
    if (type === 'languages') {
      const languageSkill = skill as { language: string; proficiency: string; iso639_1: string };
      // For languages, get the name from the ID
      let languageName = languageSkill.language; // Default to ID
      if (!languagesLoading) {
        languageName = getLanguageNameById(languageSkill.language) || languageSkill.language;
      }
      setNewSkill({
        language: languageName,
        proficiency: languageSkill.proficiency,
        iso639_1: languageSkill.iso639_1,
        level: 1
      });
    } else {
      // Handle non-language skills - support both ObjectId format and string format
      let skillId = '';
      let skillLevel = 1;
      
      if (typeof skill === 'string') {
        // Handle case where skill is still a string (not yet migrated)
        skillId = skill;
        skillLevel = 1;
      } else if (typeof skill === 'object' && skill !== null) {
        // Type guard to check if it's a skill object
        if ('skill' in skill && skill.skill) {
          if (typeof skill.skill === 'string') {
            // Handle case where skill.skill is still a string (not yet migrated)
            skillId = skill.skill;
            skillLevel = (skill as any).level || 1;
          } else if (typeof skill.skill === 'object' && skill.skill.$oid) {
            // Handle ObjectId format
            skillId = skill.skill.$oid;
            skillLevel = (skill as any).level || 1;
          }
        }
      }
      
      setNewSkill({ 
        language: skillId, 
        proficiency: '', 
        iso639_1: '',
        level: skillLevel
      });
    }
  };

  const handleEditChange = (field: 'language' | 'proficiency' | 'iso639_1' | 'level', value: string | number) => {
    setNewSkill({ ...newSkill, [field]: value });
  };

  const handleEditSave = () => {
    if (!editingIndex || !newSkill.language) return;
    
    // Check for duplicates only if the language/skill name has changed
    const currentSkill = safeData[editingIndex.type as keyof typeof safeData][editingIndex.index];
    let nameChanged = false;
    
    if (editingIndex.type === 'languages') {
      const languageSkill = currentSkill as { language: string; proficiency: string; iso639_1: string };
      // For languages, compare by name (since we're editing with names)
      let currentLanguageName = languageSkill.language; // Default to ID
      if (!languagesLoading) {
        currentLanguageName = getLanguageNameById(languageSkill.language) || languageSkill.language;
      }
      nameChanged = currentLanguageName !== newSkill.language;
    } else {
      // Handle skills - support both ObjectId format and string format
      let currentSkillId = '';
      
      if (typeof currentSkill === 'string') {
        currentSkillId = currentSkill;
      } else if (typeof currentSkill === 'object' && currentSkill !== null && 'skill' in currentSkill) {
        if (typeof currentSkill.skill === 'string') {
          currentSkillId = currentSkill.skill;
        } else if (typeof currentSkill.skill === 'object' && currentSkill.skill.$oid) {
          currentSkillId = currentSkill.skill.$oid;
        }
      }
      
      nameChanged = currentSkillId !== newSkill.language;
    }
    
    if (nameChanged && isDuplicate(newSkill.language, editingIndex.type, editingIndex.index)) return;
    
    const updated = [...safeData[editingIndex.type as keyof typeof safeData]];
    if (editingIndex.type === 'languages') {
      // For languages, find the language ID from the name
      const selectedLanguage = languages.find(l => l.label === newSkill.language);
      if (selectedLanguage) {
        updated[editingIndex.index] = {
          language: selectedLanguage.value, // Store the ID
          proficiency: newSkill.proficiency,
          iso639_1: selectedLanguage.code
        };
      } else {
        console.warn(`Language "${newSkill.language}" not found in available options. Skipping update.`);
        return;
      }
    } else {
      // For skills, we need to find the skill object to get both ID and name
      let selectedSkill;
      if (editingIndex.type === 'professional') {
        selectedSkill = professionalSkills.find(s => s._id === newSkill.language);
      } else if (editingIndex.type === 'technical') {
        selectedSkill = technicalSkills.find(s => s._id === newSkill.language);
      } else if (editingIndex.type === 'soft') {
        selectedSkill = softSkills.find(s => s._id === newSkill.language);
      }
      
      if (selectedSkill) {
        updated[editingIndex.index] = {
          skill: { $oid: selectedSkill._id }, // Store MongoDB ObjectId format
          level: newSkill.level,
          details: selectedSkill.description || '' // Add details field
        };
      } else {
        console.warn(`Skill with ID "${newSkill.language}" not found in ${editingIndex.type} skills. Available skills:`, 
          editingIndex.type === 'professional' ? professionalSkills.map(s => ({ id: s._id, name: s.name })) :
          editingIndex.type === 'technical' ? technicalSkills.map(s => ({ id: s._id, name: s.name })) :
          softSkills.map(s => ({ id: s._id, name: s.name }))
        );
        return; // Exit early without updating the skill
      }
    }
    
    onChange({ ...safeData, [editingIndex.type]: updated });
    setEditingIndex(null);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
  };

  const handleRemove = (type: string, idx: number) => {
    const updated = safeData[type as keyof typeof safeData].filter((_: any, i: number) => i !== idx);
    onChange({ ...safeData, [type]: updated });
    if (editingIndex?.index === idx) setEditingIndex(null);
  };

  // Add new skill
  const handleAdd = () => {
    if (!addMode.active || !newSkill.language || isDuplicate(newSkill.language, addMode.type)) return;

    let updated;
    if (addMode.type === 'languages') {
      // For languages, find the language ID from the name
      const selectedLanguage = languages.find(l => l.label === newSkill.language);
      if (selectedLanguage) {
        updated = [...safeData.languages, {
          language: selectedLanguage.value, // Store the ID
          proficiency: newSkill.proficiency,
          iso639_1: selectedLanguage.code
        }];
      } else {
        console.warn(`Language "${newSkill.language}" not found in available options. Skipping.`);
        return;
      }
    } else {
      // For skills, we need to find the skill object to get both ID and name
      let selectedSkill;
      if (addMode.type === 'professional') {
        selectedSkill = professionalSkills.find(s => s._id === newSkill.language);
      } else if (addMode.type === 'technical') {
        selectedSkill = technicalSkills.find(s => s._id === newSkill.language);
      } else if (addMode.type === 'soft') {
        selectedSkill = softSkills.find(s => s._id === newSkill.language);
      }
      
      if (selectedSkill) {
        updated = [...safeData[addMode.type as keyof typeof safeData], {
          skill: { $oid: selectedSkill._id }, // Store MongoDB ObjectId format
          level: newSkill.level,
          details: selectedSkill.description || '' // Add details field
        }];
      } else {
        console.warn(`Skill with ID "${newSkill.language}" not found in ${addMode.type} skills. Available skills:`, 
          addMode.type === 'professional' ? professionalSkills.map(s => ({ id: s._id, name: s.name })) :
          addMode.type === 'technical' ? technicalSkills.map(s => ({ id: s._id, name: s.name })) :
          softSkills.map(s => ({ id: s._id, name: s.name }))
        );
        return; // Exit early without adding the skill
      }
    }
    onChange({ ...safeData, [addMode.type]: updated });
    setNewSkill({ language: '', proficiency: '', iso639_1: '', level: 1 });
    setAddMode({ type: '', active: false });
  };

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

    const handleConfirmAddSkill = () => {
      const skillId = selectedSkillToAdd[skillType];
      if (!skillId) return;
      
      const exactPos = selectedExactPosition[skillType];
      addSkill(skillType, skillId, selectedLevelToAdd[skillType], exactPos);
      
      // Reset states
      setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
      setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
      setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
      setSelectedExactPosition(prev => ({ ...prev, [skillType]: undefined }));
    };

    const handleCancelAddSkill = () => {
      setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
      setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
      setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
      setSelectedExactPosition(prev => ({ ...prev, [skillType]: undefined }));
    };

    const handleStartEditSkill = (index: number) => {
      setEditingSkill(prev => ({ ...prev, [skillType]: index }));
    };

    const handleConfirmEditSkill = (index: number, newSkillId: string) => {
      if (skillType === 'languages') {
        const currentLanguage = safeData.languages[index];
        if (currentLanguage) {
          const updatedLanguages = [...safeData.languages];
          updatedLanguages[index] = {
            ...currentLanguage,
            language: newSkillId
          };
          onChange({ ...safeData, languages: updatedLanguages });
        }
      } else {
        const currentSkills = (safeData as any)[skillType] as any[];
        if (currentSkills && currentSkills[index]) {
          const updatedSkills = [...currentSkills];
          updatedSkills[index] = {
            ...updatedSkills[index],
            skill: newSkillId
          };
          onChange({ ...safeData, [skillType]: updatedSkills });
        }
      }

      // Reset editing state
      setEditingSkill(prev => ({ ...prev, [skillType]: null }));
    };

    const handleCancelEditSkill = () => {
      setEditingSkill(prev => ({ ...prev, [skillType]: null }));
    };

    const handleRemoveSkill = (index: number) => {
      deleteSkill(skillType, index);
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

    const getSkillOptions = (editingIndex?: number) => {
      switch (skillType) {
        case "languages":
          return languages
            .filter(lang => {
              if (editingIndex !== undefined && currentItems[editingIndex] && currentItems[editingIndex].language === lang.value) {
                return true;
              }
              return !currentItems.some(item => item.language === lang.value);
            })
            .map(lang => ({ id: lang.value, name: lang.label }));
        case "professional":
          return professionalSkills
            .filter(skill => {
              if (editingIndex !== undefined && currentItems[editingIndex] && currentItems[editingIndex].skill) {
                const currentSkillId = typeof currentItems[editingIndex].skill === 'string' 
                  ? currentItems[editingIndex].skill 
                  : (currentItems[editingIndex].skill && typeof currentItems[editingIndex].skill === 'object' && currentItems[editingIndex].skill.$oid 
                      ? currentItems[editingIndex].skill.$oid 
                      : null);
                if (currentSkillId === skill._id) {
                  return true;
                }
              }
              return !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
              });
            })
            .map(skill => ({ id: skill._id, name: skill.name }));
        case "technical":
          return technicalSkills
            .filter(skill => {
              if (editingIndex !== undefined && currentItems[editingIndex] && currentItems[editingIndex].skill) {
                const currentSkillId = typeof currentItems[editingIndex].skill === 'string' 
                  ? currentItems[editingIndex].skill 
                  : (currentItems[editingIndex].skill && typeof currentItems[editingIndex].skill === 'object' && currentItems[editingIndex].skill.$oid 
                      ? currentItems[editingIndex].skill.$oid 
                      : null);
                if (currentSkillId === skill._id) {
                  return true;
                }
              }
              return !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
              });
            })
            .map(skill => ({ id: skill._id, name: skill.name }));
        case "soft":
          return softSkills
            .filter(skill => {
              if (editingIndex !== undefined && currentItems[editingIndex] && currentItems[editingIndex].skill) {
                const currentSkillId = typeof currentItems[editingIndex].skill === 'string' 
                  ? currentItems[editingIndex].skill 
                  : (currentItems[editingIndex].skill && typeof currentItems[editingIndex].skill === 'object' && currentItems[editingIndex].skill.$oid 
                      ? currentItems[editingIndex].skill.$oid 
                      : null);
                if (currentSkillId === skill._id) {
                  return true;
                }
              }
              return !currentItems.some(item => {
              if (!item || !item.skill) return false;
              const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
              return skillId === skill._id;
              });
            })
            .map(skill => ({ id: skill._id, name: skill.name }));
        default:
          return [];
      }
    };

    const skillOptions = getSkillOptions();
    const editSkillOptions = getSkillOptions(editingSkill[skillType] ?? undefined);

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
          <div className="text-center py-8 text-gray-500">
            <p>Skills with interactive progress bars coming soon...</p>
            <button
              onClick={handleShowAddInterface}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              + Add {title.slice(0, -1)}
            </button>
          </div>
        </div>
      </div>
    );
    
    if (isLanguage) {
      // For languages, use the API data
      options = languages.map((lang: { value: string; label: string; code: string }) => ({ 
        _id: lang.value, 
        name: lang.label, 
        description: '', 
        category: 'language' 
      }));
      isLoading = languagesLoading;
      hasError = false; // Languages don't have error state for now
    } else {
      switch (type) {
        case 'professional':
          // Use the actual API data instead of getProfessionalSkillOptions()
          options = professionalSkills.map(skill => ({ 
            _id: skill._id, 
            name: skill.name, 
            description: skill.description, 
            category: skill.category 
          }));
          isLoading = loadingSkills.professional;
          hasError = errorSkills.professional;
          break;
        case 'technical':
          // Use the actual API data instead of getTechnicalSkillOptions()
          options = technicalSkills.map(skill => ({ 
            _id: skill._id, 
            name: skill.name, 
            description: skill.description, 
            category: skill.category 
          }));
          isLoading = loadingSkills.technical;
          hasError = errorSkills.technical;
          break;
        case 'soft':
          // Use the actual API data instead of getSoftSkillOptions()
          options = softSkills.map(skill => ({ 
            _id: skill._id, 
            name: skill.name, 
            description: skill.description, 
            category: skill.category 
          }));
          isLoading = loadingSkills.soft;
          hasError = errorSkills.soft;
          break;
        default:
          options = [];
      }
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className={`bg-gradient-to-r ${getHeaderGradient(bgColor)} px-6 py-4`}>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
              {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 text-white" })}
          </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-white/80 text-sm">{description}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
              {isLoading && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              )}
              {hasError && !isLoading && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">⚠️ Failed to load skills</span>
                  <button
                    onClick={() => {
                      const fetchSkills = async () => {
                        try {
                          setLoadingSkills(prev => ({ ...prev, [type]: true }));
                          setErrorSkills(prev => ({ ...prev, [type]: false }));
                          const response = await fetch(`${import.meta.env.VITE_REP_URL}/skills/${type}`);
                          if (response.ok) {
                            const data = await response.json();
                            const setter = type === 'professional' ? setProfessionalSkills : 
                                         type === 'technical' ? setTechnicalSkills : setSoftSkills;
                            setter(data.data || []);
                          } else {
                            setErrorSkills(prev => ({ ...prev, [type]: true }));
                          }
                          setLoadingSkills(prev => ({ ...prev, [type]: false }));
                        } catch (error) {
                          console.error(`Error fetching ${type} skills:`, error);
                          setLoadingSkills(prev => ({ ...prev, [type]: false }));
                          setErrorSkills(prev => ({ ...prev, [type]: true }));
                        }
                      };
                      fetchSkills();
                    }}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          
        {/* List */}
        <div className="mb-4 space-y-2">
          {validSkills
            .map((skill, idx) => {
              let skillName = '';
              if (isLanguage) {
                // For languages, get the name from the ID
                if (languagesLoading) {
                  skillName = 'Loading...';
                } else {

                  // Try to find the language by ID first
                  let languageName = getLanguageNameById(skill.language);
                  
                  // If not found by ID, try to find by name (fallback for old data)
                  if (!languageName || languageName === '') {
                    const foundLanguage = languages.find(l => l.label === skill.language);
                    if (foundLanguage) {
                      languageName = foundLanguage.label;
                    } else {
                      // If still not found, try to find by code or partial match
                      const foundByCode = languages.find(l => l.code === skill.language);
                      if (foundByCode) {
                        languageName = foundByCode.label;
                      }
                    }
                  }
                  
                  skillName = languageName || skill.language;
                }
              } else {
                if (typeof skill === 'string') {
                  // Handle string skill (ID or name)
                  if (type === 'soft') {
                    const foundSkill = softSkills.find(s => s._id === skill);
                    skillName = foundSkill ? foundSkill.name : 'Unknown Soft Skill';
                  } else if (type === 'technical') {
                    const foundSkill = technicalSkills.find(s => s._id === skill);
                    skillName = foundSkill ? foundSkill.name : 'Unknown Technical Skill';
                  } else if (type === 'professional') {
                    const foundSkill = professionalSkills.find(s => s._id === skill);
                    skillName = foundSkill ? foundSkill.name : 'Unknown Professional Skill';
                  }
                } else if (skill.skill) {
                  if (typeof skill.skill === 'string') {
                    // Handle skill.skill as string (ID or name)
                    if (type === 'soft') {
                      const foundSkill = softSkills.find(s => s._id === skill.skill);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Soft Skill';
                    } else if (type === 'technical') {
                      const foundSkill = technicalSkills.find(s => s._id === skill.skill);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Technical Skill';
                    } else if (type === 'professional') {
                      const foundSkill = professionalSkills.find(s => s._id === skill.skill);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Professional Skill';
                    }
                  } else if (typeof skill.skill === 'object' && skill.skill.$oid) {
                    // Handle ObjectId format
                    const skillId = skill.skill.$oid;
                    if (type === 'soft') {
                      const foundSkill = softSkills.find(s => s._id === skillId);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Soft Skill';
                    } else if (type === 'technical') {
                      const foundSkill = technicalSkills.find(s => s._id === skillId);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Technical Skill';
                    } else if (type === 'professional') {
                      const foundSkill = professionalSkills.find(s => s._id === skillId);
                      skillName = foundSkill ? foundSkill.name : 'Unknown Professional Skill';
                      
                      // Debug: Log what's happening with professional skill rendering
                      console.log(`🎯 Rendering ${type} skill:`, {
                        skillId,
                        availableSkills: professionalSkills.length,
                        foundSkill,
                        skillName,
                        skillData: skill
                      });
                    }
                  } else if (typeof skill.skill === 'object' && !skill.skill.$oid) {
                    // Handle case where skill.skill is an object but not $oid format
                    // This might be a direct skill object or malformed data
                    console.log(`⚠️ Rendering skill with unexpected format:`, skill.skill);
                    
                    // Try to extract skill name from the object if possible
                    if (skill.skill.name) {
                      skillName = skill.skill.name;
                    } else if (skill.skill.skill) {
                      // Nested skill object
                      const nestedSkillId = typeof skill.skill.skill === 'string' ? skill.skill.skill : skill.skill.skill.$oid;
                      if (nestedSkillId) {
                        if (type === 'soft') {
                          const foundSkill = softSkills.find(s => s._id === nestedSkillId);
                          skillName = foundSkill ? foundSkill.name : 'Unknown Soft Skill';
                        } else if (type === 'technical') {
                          const foundSkill = technicalSkills.find(s => s._id === nestedSkillId);
                          skillName = foundSkill ? foundSkill.name : 'Unknown Technical Skill';
                        } else if (type === 'professional') {
                          const foundSkill = professionalSkills.find(s => s._id === nestedSkillId);
                          skillName = foundSkill ? foundSkill.name : 'Unknown Professional Skill';
                        }
                      }
                    }
                    
                    if (!skillName) {
                      skillName = `Unknown ${type.charAt(0).toUpperCase() + type.slice(1)} Skill`;
                    }
                  }
                }
                

              }
              // Don't display skills with invalid names
              if (!skillName || skillName === '' || skillName === 'Unknown Skill') return null;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 mb-2 border transition-all duration-200 ${
                    editingIndex?.type === type && editingIndex?.index === idx && !addMode.active
                      ? `bg-${bgColor}-50/70 border-${bgColor}-300 shadow-sm ring-2 ring-${bgColor}-200` 
                      : 'bg-white border-blue-100 hover:border-blue-200 hover:shadow-sm'
                  } rounded-lg group`}
                >
                  {editingIndex?.type === type && editingIndex?.index === idx && !addMode.active ? (
                    <div className="flex gap-3 items-center w-full">
                      <select
                        className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
                        value={newSkill.language}
                        onChange={e => {
                          if (isLanguage) {
                            const selected = languageOptions.find(opt => opt.language === e.target.value);
                            if (selected) {
                              setNewSkill({
                                ...newSkill,
                                language: selected.language,
                                iso639_1: selected.iso639_1
                              });
                            } else {
                              handleEditChange('language', e.target.value);
                            }
                                              } else {
                            // For skills, store the ObjectId
                            const selectedSkill = options.find(opt => opt._id === e.target.value);
                            if (selectedSkill) {
                              setNewSkill({
                                ...newSkill,
                                language: selectedSkill._id // Store ObjectId
                              });
                            }
                          }
                      }}
                        disabled={isLoading}
                      >
                        <option value="">{isLoading ? 'Loading...' : (isLanguage ? 'Select language' : 'Select skill')}</option>
                        {isLanguage ? (
                          languageOptions.map((opt: { language: string; iso639_1: string }) => (
                            <option key={opt.iso639_1} value={opt.language} disabled={isDuplicate(opt.language, type, editingIndex.index)}>
                              {opt.language}
                            </option>
                          ))
                        ) : (
                          options.map((opt: { _id: string; name: string; description: string; category: string }) => {
                            // Ne disable que si c'est un doublon ET que ce n'est pas la valeur actuelle
                            const currentSkill = skills[editingIndex?.index ?? -1];
                            const isCurrent = currentSkill && currentSkill.skill && typeof currentSkill.skill === 'object' && currentSkill.skill.$oid === opt._id;
                            return (
                              <option
                                key={opt._id}
                                value={opt._id}
                                disabled={isDuplicate(opt._id, type, editingIndex?.index) && !isCurrent}
                              >
                                {opt.name}
                              </option>
                            );
                          })
                        )}
                      </select>
                      {isLanguage && (
                        <select
                          className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
                          value={newSkill.proficiency}
                          onChange={e => handleEditChange('proficiency', e.target.value)}
                        >
                          <option value="">Select level</option>
                          {LANGUAGE_LEVELS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      {!isLanguage && (
                        <select
                          className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
                          value={newSkill.level}
                          onChange={e => handleEditChange('level', parseInt(e.target.value))}
                        >
                          {SKILL_LEVELS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2 ml-4">
                        <button
                          className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow"
                          onClick={handleEditSave}
                        >
                          Save
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 text-base flex-1">
                        <span className="font-medium">{skillName}</span>
                        {isLanguage && (
                          <>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className="text-blue-600 font-medium">{getLanguageLevelLabel(skill.proficiency)}</span>
                          </>
                        )}
                        {!isLanguage && typeof skill === 'object' && skill.level && (
                          <>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className="text-blue-600 font-medium">{getLevelLabel(skill.level)}</span>
                          </>
                        )}
                      </p>
                      <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          className={`p-2 text-${iconColor}-600 hover:bg-${iconColor}-100 rounded-lg transition-all duration-200 hover:scale-110`}
                          onClick={() => handleEdit(type, idx)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                          onClick={() => handleRemove(type, idx)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
        {/* Add skill */}
        {!isLanguage && options.length === 0 && !isLoading && !hasError && (
          <div className="text-center py-4 text-gray-500">
            <p>No skills available yet. Skills will be loaded from the API.</p>
          </div>
        )}
        {!isLanguage && isLoading && (
          <div className="text-center py-4 text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span>Loading skills...</span>
            </div>
          </div>
        )}
        {isAdding ? (
          <div className="flex gap-3 items-center mb-2 bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 shadow-sm">
            <select
              className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
              value={newSkill.language}
              onChange={e => {
                if (isLanguage) {
                  const selected = languageOptions.find(opt => opt.language === e.target.value);
                  if (selected) {
                    setNewSkill({
                      ...newSkill,
                      language: selected.language,
                      iso639_1: selected.iso639_1
                    });
                  } else {
                    handleEditChange('language', e.target.value);
                  }
                } else {
                  // For skills, store the ObjectId
                  const selectedSkill = options.find(opt => opt._id === e.target.value);
                  if (selectedSkill) {
                    setNewSkill({
                      ...newSkill,
                      language: selectedSkill._id // Store ObjectId
                    });
                  }
                }
              }}
              disabled={isLoading}
            >
              <option value="">{isLoading ? 'Loading...' : (isLanguage ? 'Select language' : 'Select skill')}</option>
              {isLanguage ? (
                languageOptions.map((opt: { language: string; iso639_1: string }) => (
                  <option key={opt.iso639_1} value={opt.language} disabled={isDuplicate(opt.language, type)}>
                    {opt.language}
                  </option>
                ))
              ) : (
                options.map((opt: { _id: string; name: string; description: string; category: string }) => {
                  // Ne disable que si c'est un doublon
                  return (
                    <option
                      key={opt._id}
                      value={opt._id}
                      disabled={isDuplicate(opt._id, type)}
                    >
                      {opt.name}
                    </option>
                  );
                })
              )}
            </select>
            {isLanguage && (
              <select
                className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
                value={newSkill.proficiency}
                onChange={e => setNewSkill({ ...newSkill, proficiency: e.target.value })}
              >
                <option value="">Select level</option>
                {LANGUAGE_LEVELS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {!isLanguage && (
              <select
                className={`border border-${bgColor}-300 focus:border-${bgColor}-500 focus:ring-2 focus:ring-${bgColor}-200 rounded-lg px-3.5 py-2 text-gray-700 text-sm outline-none transition-all w-40 bg-white`}
                value={newSkill.level}
                onChange={e => setNewSkill({ ...newSkill, level: parseInt(e.target.value) })}
              >
                {SKILL_LEVELS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <button
              className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow"
              onClick={handleAdd}
            >
              Add
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow"
              onClick={() => { setAddMode({ type: '', active: false }); setNewSkill({ language: '', proficiency: '', iso639_1: '', level: 1 }); }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
            className={`${!isLanguage && (isLoading || hasError) ? 'text-gray-400 cursor-not-allowed' : `text-${iconColor}-600 hover:text-${iconColor}-700 hover:underline`} flex items-center gap-1.5 font-medium transition-colors duration-200`} 
            onClick={() => { setAddMode({ type, active: true }); setEditingIndex(null); setNewSkill({ language: '', proficiency: '', iso639_1: '', level: 1 }); }}
            disabled={!isLanguage && (isLoading || hasError)}
          >
            + Add {type} skill
          </button>
        )}
        {errors[type] && (
          <p className="mt-2 text-sm text-red-600">{errors[type].join(', ')}</p>
        )}
        </div>
      </div>
    );
  };



  // Debug logs
  console.log('🎯 SKILLS SECTION - Rendering SkillsSection component');
  console.log('🎯 SKILLS SECTION - data:', data);
  console.log('🎯 SKILLS SECTION - safeData:', safeData);
  console.log('🎯 SKILLS SECTION - languages:', safeData.languages);
  console.log('🎯 SKILLS SECTION - professional:', safeData.professional);
  console.log('🎯 SKILLS SECTION - technical:', safeData.technical);
  console.log('🎯 SKILLS SECTION - soft:', safeData.soft);
  console.log('🎯 SKILLS SECTION - certifications:', safeData.certifications);
  console.log('🎯 SKILLS SECTION - professionalSkills from API:', professionalSkills);
  console.log('🎯 SKILLS SECTION - softSkills from API:', softSkills);
  console.log('🎯 SKILLS SECTION - technicalSkills from API:', technicalSkills);
  console.log('🎯 SKILLS SECTION - languages from API:', languages);
  console.log('🎯 SKILLS SECTION - loadingSkills:', loadingSkills);
  console.log('🎯 SKILLS SECTION - errorSkills:', errorSkills);
  console.log('🎯 SKILLS SECTION - languagesLoading:', languagesLoading);
  console.log('🎯 SKILLS SECTION - errors:', errors);
  
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
            {renderSkillSection(
              'languages',
              'Languages',
              'Specify required languages and proficiency levels',
              <Languages className="w-5 h-5 text-blue-600" />,
              'blue',
              'blue',
              true
            )}

            {/* Professional Skills */}
            {renderSkillSection(
              'professional',
              'Professional Skills',
              'Add required professional and industry-specific skills',
              <BookOpen className="w-5 h-5 text-purple-600" />,
              'purple',
              'purple'
            )}

            {/* Technical Skills */}
            {renderSkillSection(
              'technical',
              'Technical Skills',
              'Specify required technical tools and software proficiency',
              <Laptop className="w-5 h-5 text-emerald-600" />,
              'emerald',
              'emerald'
            )}

            {/* Soft Skills */}
            {renderSkillSection(
              'soft',
              'Soft Skills',
              'Add interpersonal and communication skills',
              <Users className="w-5 h-5 text-orange-600" />,
              'orange',
              'orange'
            )}
          </div>

          {/* Skill Summary */}
          {(safeData.languages.length > 0 || safeData.professional.length > 0 || 
            safeData.technical.length > 0 || safeData.soft.length > 0) && (
            <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Skills Summary</h4>
              <div className="space-y-3">
                {safeData.languages.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      {safeData.languages.length} language{safeData.languages.length > 1 ? 's' : ''} required
                    </span>
                  </div>
                )}
                {safeData.professional.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50/50 rounded-lg">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-600">
                      {safeData.professional.length} professional skill{safeData.professional.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {safeData.technical.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-gray-600">
                      {safeData.technical.length} technical skill{safeData.technical.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {safeData.soft.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50/50 rounded-lg">
                    <Users className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-600">
                      {safeData.soft.length} soft skill{safeData.soft.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
              onClick={() => {
                // Final migration to ensure all skills are in ObjectId format
                const finalMigration = () => {
                  let needsUpdate = false;
                  const migratedData = { ...safeData };
                  
                  ['soft', 'professional', 'technical'].forEach(type => {
                    const skillArray = migratedData[type as keyof typeof migratedData];
                    if (skillArray && Array.isArray(skillArray)) {
                      const migratedSkills = skillArray.map((skill: any) => {
                        // Helper function to find skill by name
                        const findSkillByName = (skillName: string, skillType: string) => {
                          let found;
                          
                          if (skillType === 'soft') {
                            found = softSkills.find(s => s.name === skillName);
                            if (!found) {
                              found = softSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                            }
                            if (!found) {
                              found = softSkills.find(s => 
                                s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                                skillName.toLowerCase().includes(s.name.toLowerCase())
                              );
                            }
                          } else if (skillType === 'professional') {
                            found = professionalSkills.find(s => s.name === skillName);
                            if (!found) {
                              found = professionalSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                            }
                            if (!found) {
                              found = professionalSkills.find(s => 
                                s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                                skillName.toLowerCase().includes(s.name.toLowerCase())
                              );
                            }
                          } else if (skillType === 'technical') {
                            found = technicalSkills.find(s => s.name === skillName);
                            if (!found) {
                              found = technicalSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                            }
                            if (!found) {
                              found = technicalSkills.find(s => 
                                s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                                skillName.toLowerCase().includes(s.name.toLowerCase())
                              );
                            }
                          }
                          
                          return found;
                        };

                        // If skill is a string, convert to ObjectId format
                        if (typeof skill === 'string') {
                          const foundSkill = findSkillByName(skill, type);
                          if (foundSkill) {
                            needsUpdate = true;
                            return { 
                              skill: { $oid: foundSkill._id }, 
                              level: 1,
                              details: foundSkill.description || 'Migrated from string'
                            };
                          } else {
                            return null; // Remove skills that don't exist in database
                          }
                        }
                        
                        // If skill.skill is a string, convert to ObjectId format
                        if (skill && typeof skill.skill === 'string') {
                          const foundSkill = findSkillByName(skill.skill, type);
                          if (foundSkill) {
                            needsUpdate = true;
                            return { 
                              ...skill, 
                              skill: { $oid: foundSkill._id },
                              details: skill.details || foundSkill.description || 'Migrated from string'
                            };
                          } else {
                            return null; // Remove skills that don't exist in database
                          }
                        }
                        
                        return skill; // Already in correct format
                      }).filter(Boolean); // Remove null entries
                      (migratedData as any)[type] = migratedSkills;
                    }
                  });
                  
                  if (needsUpdate) {
                    onChange(migratedData);
                  }
                };
                
                finalMigration();
                onNext && onNext();
              }}
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