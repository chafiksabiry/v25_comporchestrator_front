import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Briefcase,
  Target,
  DollarSign,
  Gauge,
  Clock,
  Award,
  Globe2,
  AlertCircle,
  Edit2,
  X,
  CheckCircle,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Loader2,
  Users,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Calendar,
  Search,
  ChevronDown,
} from "lucide-react";
import type { GigSuggestion } from "../types";
import i18n from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json";
import en from "i18n-iso-countries/langs/en.json";
import { generateGigSuggestions } from "../lib/ai";
import { fetchSoftSkills, fetchTechnicalSkills, fetchProfessionalSkills, fetchAllCountries, Country, getCountryNameById, fetchAllCurrencies, Currency, fetchAllTimezones } from "../lib/api";
import { predefinedOptions } from "../lib/guidance";
import {
  loadActivities,
  loadIndustries,
  loadLanguages,
  getActivityOptions,
  getIndustryOptions,
  getLanguageOptions,
  getActivityNameById,
  getIndustryNameById,
  getLanguageNameById
} from '../lib/activitiesIndustries';
import Logo from "./Logo";
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

type ScheduleEntry = {
  day: string;
  hours: { start: string; end: string };
  _id?: { $oid: string };
};

type GroupedSchedule = {
  hours: { start: string; end: string };
  days: string[];
};

// Timezone data type with _id
type TimezoneData = {
  _id: string;
  countryCode: string;
  countryName: string;
  zoneName: string;
  gmtOffset: number;
  lastUpdated?: string;
  __v?: number;
  createdAt?: string;
  updatedAt?: string;
};

// Processed timezone type for UI
type ProcessedTimezone = {
  _id: string;
  name: string;
  offset: number;
  abbreviation: string;
  countryName: string;
};

// Register languages
i18n.registerLocale(fr);
i18n.registerLocale(en);

// Helper function to check if a value is a string array

// Country data type
type CountryData = {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
};

interface SuggestionsProps {
  input: string;
  onBack: () => void;
  onConfirm: (suggestions: GigSuggestion) => void;
  initialSuggestions?: GigSuggestion | null;
}

// OpenAI functionality has been moved to backend API


// Major countries with their alpha-2 codes
const DESTINATION_ZONES: { [key: string]: string } = {
  "FR": "France",
  "US": "United States",
  "GB": "United Kingdom",
  "DE": "Germany",
  "CA": "Canada",
  "AU": "Australia",
  "JP": "Japan",
  "IN": "India",
  "BR": "Brazil",
  "MX": "Mexico",
  "ES": "Spain",
  "IT": "Italy",
  "NL": "Netherlands",
  "SE": "Sweden",
  "NO": "Norway",
  "DK": "Denmark",
  "FI": "Finland",
  "CH": "Switzerland",
  "AT": "Austria",
  "BE": "Belgium",
  "PT": "Portugal",
  "IE": "Ireland",
  "NZ": "New Zealand",
  "SG": "Singapore",
  "KR": "South Korea",
  "CN": "China",
  "RU": "Russia",
  "ZA": "South Africa",
  "AR": "Argentina",
  "CL": "Chile",
  "CO": "Colombia",
  "PE": "Peru",
  "VE": "Venezuela",
  "UY": "Uruguay",
  "PY": "Paraguay",
  "BO": "Bolivia",
  "EC": "Ecuador",
  "GY": "Guyana",
  "SR": "Suriname",
  "GF": "French Guiana",
};







const LANGUAGE_LEVELS = [
  { value: "A1", label: "A1 - Beginner" },
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "C1", label: "C1 - Advanced" },
  { value: "C2", label: "C2 - Mastery" },
];

const SKILL_LEVELS = [
  { value: 1, label: "Basic" },
  { value: 2, label: "Intermediate" },
  { value: 3, label: "Advanced" },
  { value: 4, label: "Expert" },
  { value: 5, label: "Master" },
];



const BONUS_TYPES = ["Performance Bonus", "Team Bonus"];

const TRANSACTION_TYPES = [
  "Fixed Amount",
  "Percentage",
  "Tiered Amount",
  "Volume Based",
  "Performance Based",
];

const TEAM_ROLES = [
  "Agent Senior",
  "Agent",
  "Agent Junior",
  "Supervisor",
];

// Territories will be loaded from API

const MAJOR_TIMEZONES: { [key: string]: { name: string; offset: number } } = {
  "New York (EST/EDT)": { name: "New York (EST/EDT)", offset: -5 },
  "Chicago (CST/CDT)": { name: "Chicago (CST/CDT)", offset: -6 },
  "Denver (MST/MDT)": { name: "Denver (MST/MDT)", offset: -7 },
  "Los Angeles (PST/PDT)": { name: "Los Angeles (PST/PDT)", offset: -8 },
  "London (GMT/BST)": { name: "London (GMT/BST)", offset: 0 },
  "Paris (CET/CEST)": { name: "Paris (CET/CEST)", offset: 1 },
  "Dubai (GST)": { name: "Dubai (GST)", offset: 4 },
  "Singapore (SGT)": { name: "Singapore (SGT)", offset: 8 },
  "Tokyo (JST)": { name: "Tokyo (JST)", offset: 9 },
  "Sydney (AEST/AEDT)": { name: "Sydney (AEST/AEDT)", offset: 10 },
};


const FLEXIBILITY_SELECT_OPTIONS = [
  "Remote Work Available",
  "Flexible Hours",
  "Weekend Rotation",
  "Night Shift Available",
  "Split Shifts",
  "Part-Time Options",
  "Compressed Work Week",
  "Shift Swapping Allowed",
];

export const Suggestions: React.FC<SuggestionsProps> = (props) => {
  const [suggestions, setSuggestions] = useState<GigSuggestion | null>(props.initialSuggestions || null);
  const [loading, setLoading] = useState(!props.initialSuggestions);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [allTimezones, setAllTimezones] = useState<TimezoneData[]>([]);
  const [availableTimezones, setAvailableTimezones] = useState<ProcessedTimezone[]>([]);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [timezonesLoaded, setTimezonesLoaded] = useState(false);
  const [allCountries, setAllCountries] = useState<CountryData[]>([]);
  const [searchResults, setSearchResults] = useState<CountryData[]>([]);
  const [searching, setSearching] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [softSkills, setSoftSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [technicalSkills, setTechnicalSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [professionalSkills, setProfessionalSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [territoriesFromAPI, setTerritoriesFromAPI] = useState<Country[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(true);
  const [territoryNames, setTerritoryNames] = useState<{ [key: string]: string }>({});
  const [allCountriesFromAPI, setAllCountriesFromAPI] = useState<Country[]>([]);
  const [destinationCountriesLoading, setDestinationCountriesLoading] = useState(false);
  const isGeneratingRef = useRef(false);
  const lastProcessedInputRef = useRef<string>("");
  const skillsLoadedRef = useRef(false);
  const [activities, setActivities] = useState<Array<{ value: string; label: string; category: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ value: string; label: string }>>([]);
  const [languages, setLanguages] = useState<Array<{ value: string; label: string; code: string }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);

  // States for textarea inputs
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');

  // States for showing add forms
  const [showJobTitleForm, setShowJobTitleForm] = useState(false);
  const [showHighlightForm, setShowHighlightForm] = useState(false);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);

  // States for editing existing items
  const [editingJobTitleIndex, setEditingJobTitleIndex] = useState<number | null>(null);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [editingDeliverableIndex, setEditingDeliverableIndex] = useState<number | null>(null);

  // States for selection
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | null>(null);

  // States for skill adding interface
  const [showAddSkillInterface, setShowAddSkillInterface] = useState<{ [key: string]: boolean }>({
    languages: false,
    professional: false,
    technical: false,
    soft: false
  });
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<{ [key: string]: string }>({
    languages: '',
    professional: '',
    technical: '',
    soft: ''
  });
  const [selectedLevelToAdd, setSelectedLevelToAdd] = useState<{ [key: string]: number }>({
    languages: 2, // B1 par défaut
    professional: 1,
    technical: 1,
    soft: 1
  });
  const [selectedExactPosition, setSelectedExactPosition] = useState<{ [key: string]: number | undefined }>({
    languages: undefined,
    professional: undefined,
    technical: undefined,
    soft: undefined
  });
  const [hoveredLevel, setHoveredLevel] = useState<{ [key: string]: number | null }>({
    languages: null,
    professional: null,
    technical: null,
    soft: null
  });
  // Plus besoin de searchTerm car on utilise uniquement des sélecteurs

  // États pour l'édition des langues existantes
  const [editingSkill, setEditingSkill] = useState<{ [key: string]: number | null }>({
    professional: null,
    technical: null,
    soft: null,
    languages: null
  });
  // Plus besoin de editSearchTerm car on utilise uniquement des sélecteurs

  // État pour le hover sur les niveaux des cartes existantes
  const [hoveredExistingLevel, setHoveredExistingLevel] = useState<{ [key: string]: { [index: number]: number | null } }>({
    professional: {},
    technical: {},
    soft: {},
    languages: {}
  });

  // State for currency searchable dropdown
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchTerm, setCurrencySearchTerm] = useState("");
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Ref pour gérer le clic dehors
  const addInterfaceRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Gestion du clic dehors pour fermer l'interface d'ajout et le dropdown de devise
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Pour les interfaces d'ajout de compétences
      Object.keys(showAddSkillInterface).forEach(skillType => {
        if (showAddSkillInterface[skillType] && addInterfaceRefs.current[skillType]) {
          if (!addInterfaceRefs.current[skillType]!.contains(event.target as Node)) {
            // Fermer l'interface sans sauvegarder
            setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
            setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
            setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
            setSelectedExactPosition(prev => ({ ...prev, [skillType]: undefined }));
            setHoveredLevel(prev => ({ ...prev, [skillType]: null }));
          }
        }
      });

      // Pour le dropdown de devise
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }

      // Gérer aussi le clic dehors pour l'édition
      const target = event.target as HTMLElement;
      const isClickInsideEditDropdown = target.closest('.edit-dropdown');
      const isClickInsideEditInput = target.closest('input[type="text"]');
      const isClickInsideEditSelect = target.closest('select') || target.closest('.edit-select');

      if (!isClickInsideEditDropdown && !isClickInsideEditInput && !isClickInsideEditSelect) {
        // Annuler toute édition en cours
        setEditingSkill({
          professional: null,
          technical: null,
          soft: null,
          languages: null
        });
        // Plus besoin de reset editSearchTerm
        // Reset hover states
        setHoveredExistingLevel({
          professional: {},
          technical: {},
          soft: {},
          languages: {}
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddSkillInterface, selectedSkillToAdd, selectedLevelToAdd]);


  // Helper function to get currency symbol by ID or code
  const getCurrencySymbol = (currencyId: string): string => {
    if (!currencyId) return '€';
    // Try to find by ID first, then by code (to handle potential ID mismatches)
    const currency = currencies.find(c => c._id === currencyId || c.code === currencyId);
    return currency?.symbol || '€';
  };

  // Helper function to get default currency (EUR if available, otherwise first in list)
  const getDefaultCurrencyId = (): string => {
    if (currencies.length === 0) return '';
    const eurCurrency = currencies.find(c => c.code === 'EUR');
    return eurCurrency?._id || currencies[0]?._id || '';
  };



  // Load currencies from API
  useEffect(() => {
    const loadCurrencies = async () => {
      setCurrenciesLoading(true);
      try {
        console.log('💰 SUGGESTIONS - Loading currencies from API...');
        const fetchedCurrencies = await fetchAllCurrencies();
        setCurrencies(fetchedCurrencies);
        console.log('💰 SUGGESTIONS - Loaded currencies:', fetchedCurrencies.length);
      } catch (error) {
        console.error('❌ Error loading currencies in Suggestions:', error);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Set default currency when currencies are loaded and suggestions exist
  useEffect(() => {
    if (currencies.length > 0 && suggestions?.commission) {
      const defaultCurrencyId = getDefaultCurrencyId();

      // Set default currency for main commission if not already set
      if (!suggestions.commission.currency) {
        setSuggestions(prev => prev ? {
          ...prev,
          commission: {
            ...prev.commission,
            currency: defaultCurrencyId
          }
        } : null);
      }

      console.log('💰 SUGGESTIONS - Set default currency:', defaultCurrencyId);
    }
  }, [currencies, suggestions?.commission]);

  const filteredCurrencies = React.useMemo(() => {
    if (!currencySearchTerm.trim()) return currencies;
    const term = currencySearchTerm.toLowerCase();
    return currencies.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term)
    );
  }, [currencies, currencySearchTerm]);

  // Load activities, industries, and languages from external API
  useEffect(() => {
    const loadActivitiesIndustriesAndLanguages = async () => {

      try {
        setActivitiesLoading(true);
        setIndustriesLoading(true);
        setLanguagesLoading(true);

        await loadActivities();

        await loadIndustries();

        await loadLanguages();

        // Get options for UI components
        const activityOptions = getActivityOptions();
        const industryOptions = getIndustryOptions();
        const languageOptions = getLanguageOptions();



        // Log sample data for debugging
        if (activityOptions.length > 0) {
        }
        if (industryOptions.length > 0) {
        }
        if (languageOptions.length > 0) {
        }

        setActivities(activityOptions);
        setIndustries(industryOptions);
        setLanguages(languageOptions);



      } catch (error) {
        console.error('❌ Suggestions: Error loading activities, industries, and languages:', error);
        alert(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`);
      } finally {
        setActivitiesLoading(false);
        setIndustriesLoading(false);
        setLanguagesLoading(false);
      }
    };

    loadActivitiesIndustriesAndLanguages();
  }, []);

  // Fetch all countries from API for destination zones
  useEffect(() => {
    const loadAllCountries = async () => {
      setDestinationCountriesLoading(true);
      try {
        const countries = await fetchAllCountries();
        // Sort countries alphabetically by common name
        const sortedData = countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setAllCountriesFromAPI(sortedData);
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setDestinationCountriesLoading(false);
      }
    };

    loadAllCountries();
  }, []);

  // Ensure all team roles have valid seniority structure
  const validateAndFixTeamStructure = () => {
    if (!suggestions?.team?.structure) return;

    let needsUpdate = false;
    const newSuggestions = { ...suggestions };

    newSuggestions.team.structure.forEach((role, index) => {
      // Check if role is a string and convert it to proper object structure
      if (typeof role === 'string') {
        newSuggestions.team.structure[index] = {
          roleId: role,
          count: 1,
          seniority: {
            level: "Mid-Level",
            yearsExperience: 3,
          },
        };
        needsUpdate = true;
      } else if (typeof role === 'object' && role !== null) {
        // Ensure role has required properties
        if (!role.roleId) {
          newSuggestions.team.structure[index] = {
            ...role,
            roleId: "Agent",
            count: role.count || 1,
            seniority: role.seniority || {
              level: "Mid-Level",
              yearsExperience: 3,
            },
          };
          needsUpdate = true;
        } else if (!role.seniority) {
          newSuggestions.team.structure[index] = {
            ...role,
            seniority: {
              level: "Mid-Level",
              yearsExperience: 3,
            },
          };
          needsUpdate = true;
        } else if (!role.seniority.level || !role.seniority.yearsExperience) {
          newSuggestions.team.structure[index] = {
            ...role,
            seniority: {
              level: role.seniority.level || "Mid-Level",
              yearsExperience: role.seniority.yearsExperience || 3,
            },
          };
          needsUpdate = true;
        }
      } else {
        // If role is null, undefined, or invalid, replace with default structure
        newSuggestions.team.structure[index] = {
          roleId: "Agent",
          count: 1,
          seniority: {
            level: "Mid-Level",
            yearsExperience: 3,
          },
        };
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setSuggestions(prev => prev ? newSuggestions : null);
    }
  };

  // Validate team structure when suggestions change
  useEffect(() => {
    if (suggestions?.team?.structure) {
      validateAndFixTeamStructure();
    }
  }, []); // Only run once on mount to prevent infinite loop

  // Fetch all countries, timezones, and skills when component mounts
  useEffect(() => {
    const fetchAllData = async () => {
      // Fetch countries
      if (allCountries.length === 0) {
        try {
          const countries = await fetchAllCountries();
          const countriesData = countries.map(country => ({
            name: {
              common: country.name.common,
              official: country.name.official
            },
            cca2: country.cca2
          }));
          setAllCountries(countriesData);
        } catch (error) {
          console.error('❌ Error fetching countries:', error);
        }
      }

      // Fetch territories (countries) from API
      if (territoriesFromAPI.length === 0) {
        setTerritoriesLoading(true);
        try {
          const countries = await fetchAllCountries();
          const sortedCountries = countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
          setTerritoriesFromAPI(sortedCountries);
        } catch (error) {
          console.error('❌ Error fetching territories:', error);
          // Fallback to empty array - will show loading state
          setTerritoriesFromAPI([]);
        } finally {
          setTerritoriesLoading(false);
        }
      }

      // Fetch timezones only once
      if (!timezonesLoaded) {
        setTimezoneLoading(true);
        try {
          const data = await fetchAllTimezones();
          if (data.length > 0) {
            setAllTimezones(data);
            setTimezonesLoaded(true);
          } else {
            console.error('❌ No timezones received from API');
            // Fallback to default timezones
            setAllTimezones([]);
            setTimezonesLoaded(true);
          }
        } catch (error) {
          console.error('❌ Error fetching timezones:', error);
          setAllTimezones([]);
          setTimezonesLoaded(true);
        } finally {
          setTimezoneLoading(false);
        }
      }
    };

    fetchAllData();
  }, []); // Empty dependency array - only run once on mount

  // Process all timezones when loaded
  useEffect(() => {
    if (!timezonesLoaded || allTimezones.length === 0) {
      return;
    }

    setTimezoneLoading(true);

    try {
      // Process all timezones from the API
      const processedTimezones = allTimezones
        .map(tz => ({
          _id: tz._id,
          name: tz.zoneName,
          offset: tz.gmtOffset / 3600, // Convert seconds to hours
          abbreviation: tz.zoneName.split('/').pop() || '',
          countryName: tz.countryName
        }))
        .sort((a, b) => a.offset - b.offset);

      setAvailableTimezones(processedTimezones);
    } catch (error) {
      console.error('❌ Error processing timezones:', error);
      // Fallback to default timezones if processing fails
      setAvailableTimezones(Object.entries(MAJOR_TIMEZONES).map(([code, { name, offset }]) => ({
        _id: `default_${code}`,
        name,
        offset,
        abbreviation: code.split('(')[1]?.split(')')[0] || '',
        countryName: ''
      })));
    } finally {
      setTimezoneLoading(false);
    }
  }, [allTimezones, timezonesLoaded]);

  // No longer fetch country-specific timezones - we show all timezones available

  // Effect to show all timezones from API (no longer filtering by country)
  useEffect(() => {
    if (allTimezones && allTimezones.length > 0 && availableTimezones.length === 0) {
      const processedTimezones = allTimezones
        .map(tz => ({
          _id: tz._id,
          name: tz.zoneName,
          offset: tz.gmtOffset / 3600,
          abbreviation: tz.zoneName.split('/').pop() || '',
          countryName: tz.countryName
        }))
        .sort((a, b) => a.offset - b.offset);
      setAvailableTimezones(processedTimezones);
    }
  }, [allTimezones, availableTimezones.length]);

  // Fetch skills from API
  useEffect(() => {
    const fetchSkills = async () => {
      if (skillsLoadedRef.current) {
        return; // Already loaded
      }

      setSkillsLoading(true);

      try {
        const [softResult, technicalResult, professionalResult] = await Promise.all([
          fetchSoftSkills(),
          fetchTechnicalSkills(),
          fetchProfessionalSkills()
        ]);

        if (!softResult.error && softResult.data.length > 0) {
          setSoftSkills(softResult.data);
        }

        if (!technicalResult.error && technicalResult.data.length > 0) {
          setTechnicalSkills(technicalResult.data);
        }

        if (!professionalResult.error && professionalResult.data.length > 0) {
          setProfessionalSkills(professionalResult.data);
        }

        skillsLoadedRef.current = true;
      } catch (error) {
        console.error('❌ Error fetching skills:', error);
      } finally {
        setSkillsLoading(false);
      }
    };

    fetchSkills();
  }, []); // Empty dependency array - only run once on mount

  // Global migration effect - runs when skills are loaded
  useEffect(() => {
    if (suggestions && (softSkills.length > 0 || professionalSkills.length > 0 || technicalSkills.length > 0)) {

      const migrateAllSkills = () => {
        if (!suggestions.skills) return;

        let needsUpdate = false;
        const migratedSkills = { ...suggestions.skills };

        ['soft', 'professional', 'technical'].forEach(type => {
          const skillArray = migratedSkills[type as keyof typeof migratedSkills];
          if (skillArray && Array.isArray(skillArray)) {
            (migratedSkills as any)[type] = skillArray.map((skill: any) => {
              if (skill && typeof skill.skill === 'string') {

                let skillArray: any[] = [];
                switch (type) {
                  case 'soft': skillArray = softSkills; break;
                  case 'professional': skillArray = professionalSkills; break;
                  case 'technical': skillArray = technicalSkills; break;
                }

                // Try exact match first
                let found = skillArray.find(s => s.name === skill.skill);

                // If not found, try case-insensitive match
                if (!found) {
                  found = skillArray.find(s => s.name.toLowerCase() === skill.skill.toLowerCase());
                }

                // If still not found, try partial match
                if (!found) {
                  found = skillArray.find(s =>
                    s.name.toLowerCase().includes(skill.skill.toLowerCase()) ||
                    skill.skill.toLowerCase().includes(s.name.toLowerCase())
                  );
                }

                if (found) {
                  needsUpdate = true;
                  return {
                    ...skill,
                    skill: { $oid: found._id },
                    details: skill.details || `Migrated from "${skill.skill}" to "${found.name}"`
                  };
                } else {
                  // Keep as string but mark for later processing
                  return {
                    ...skill,
                    _needsMigration: true,
                    _originalSkill: skill.skill
                  };
                }
              }
              return skill;
            });
          }
        });

        if (needsUpdate) {
          setSuggestions(prev => prev ? { ...prev, skills: migratedSkills } : null);
        }
      };

      migrateAllSkills();
    }
  }, [softSkills, professionalSkills, technicalSkills]); // Removed suggestions from dependencies

  // Skills migration effect - runs when skills are loaded
  useEffect(() => {
    if (suggestions && (softSkills.length > 0 || professionalSkills.length > 0 || technicalSkills.length > 0)) {

      // Helper: get ObjectId for a skill name and type
      const getSkillObjectId = (skillName: string, type: string): string | undefined => {
        let arr: any[] = [];
        if (type === 'soft') arr = softSkills;
        if (type === 'professional') arr = professionalSkills;
        if (type === 'technical') arr = technicalSkills;
        const found = arr.find(s => s.name === skillName);
        return found?._id;
      };

      const migrateSkillsToObjectIds = () => {
        if (!suggestions.skills) return;

        let needsUpdate = false;
        const migratedSkills = { ...suggestions.skills } as any;

        ['soft', 'professional', 'technical'].forEach(type => {
          const skillArray = migratedSkills[type];
          if (skillArray && Array.isArray(skillArray)) {
            migratedSkills[type] = skillArray.map((skill: any) => {
              if (skill && typeof skill.skill === 'string') {
                const oid = getSkillObjectId(skill.skill, type);
                if (oid) {
                  needsUpdate = true;
                  return {
                    ...skill,
                    skill: { $oid: oid },
                    details: skill.details || 'Migrated from string'
                  };
                } else {
                  return skill; // Keep as string if not found
                }
              }
              return skill; // Already ObjectId format
            });
          }
        });

        if (needsUpdate) {
          setSuggestions(prev => prev ? { ...prev, skills: migratedSkills } : null);
        }
      };

      migrateSkillsToObjectIds();
    }
  }, [softSkills, professionalSkills, technicalSkills]); // Removed suggestions from dependencies

  // Load territory names when suggestions change
  useEffect(() => {
    const loadTerritoryNames = async () => {
      if (!suggestions?.team?.territories || suggestions.team.territories.length === 0) {
        setTerritoryNames({});
        return;
      }

      const names: { [key: string]: string } = {};
      for (const territoryId of suggestions.team.territories) {
        try {
          const name = await getCountryNameById(territoryId);
          names[territoryId] = name;
        } catch (error) {
          console.error(`Error loading territory name for ${territoryId}:`, error);
          names[territoryId] = territoryId; // Fallback to ID
        }
      }
      setTerritoryNames(names);
    };

    loadTerritoryNames();
  }, [suggestions?.team?.territories]);

  // Force migration on component mount - only run once
  useEffect(() => {
    const forceMigration = () => {
      if (suggestions && suggestions.skills) {
        let hasStringSkills = false;

        ['soft', 'professional', 'technical'].forEach(type => {
          const skillArray = (suggestions.skills as any)[type];
          if (skillArray && Array.isArray(skillArray)) {
            skillArray.forEach((skill: any) => {
              if (skill && typeof skill.skill === 'string') {
                hasStringSkills = true;
              }
            });
          }
        });

        if (hasStringSkills) {
          // Trigger the global migration effect
          const event = new CustomEvent('forceSkillsMigration');
          window.dispatchEvent(event);
        }
      }
    };

    // Run on mount
    forceMigration();

    // Listen for force migration events
    const handleForceMigration = () => {
      forceMigration();
    };

    window.addEventListener('forceSkillsMigration', handleForceMigration);

    return () => {
      window.removeEventListener('forceSkillsMigration', handleForceMigration);
    };
  }, []); // Only run on mount, removed suggestions dependency

  useEffect(() => {
    const generateSuggestions = async () => {
      // Prevent multiple simultaneous API calls
      if (isGeneratingRef.current) {
        return;
      }

      // Don't regenerate if we already processed this exact input
      if (lastProcessedInputRef.current === props.input.trim()) {
        return;
      }

      // Don't regenerate if we have initial suggestions (coming back from manual mode)
      if (props.initialSuggestions) {
        setSuggestions(props.initialSuggestions);
        setLoading(false);
        return;
      }

      try {
        isGeneratingRef.current = true;
        lastProcessedInputRef.current = props.input.trim();
        setLoading(true);
        setError(null);
        const result = await generateGigSuggestions(props.input);

        // Convert schedules from days array to individual day objects
        if (result.schedule && result.schedule.schedules) {
          const convertedSchedules: Array<ScheduleEntry> = [];
          result.schedule.schedules.forEach((schedule: any) => {
            if (schedule.days && Array.isArray(schedule.days)) {
              // Convert from days array to individual day objects
              schedule.days.forEach((day: string) => {
                convertedSchedules.push({
                  day: day,
                  hours: schedule.hours,
                  _id: {
                    $oid: `generated_${Date.now()}_${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  },
                });
              });
            } else if (schedule.day) {
              // Already in correct format
              convertedSchedules.push({
                ...schedule,
                _id: schedule._id || {
                  $oid: `generated_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                },
              });
            }
          });

          // Format times to be compliant with <input type="time">
          result.schedule.schedules.forEach((schedule) => {
            const formatTimeForInput = (timeStr: string) => {
              if (!timeStr || !timeStr.includes(":")) return "00:00";
              const [h, m] = timeStr.split(":");
              return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
            };
            schedule.hours.start = formatTimeForInput(schedule.hours.start);
            schedule.hours.end = formatTimeForInput(schedule.hours.end);
          });

          result.schedule.schedules = convertedSchedules;
        }

        // Commission data is now used directly as an object (no options array needed)

        // Validate and filter sectors to only allow predefined ones
        if (result.sectors && result.sectors.length > 0) {


          const validSectors = result.sectors.filter(sector => {
            const isValid = predefinedOptions.sectors.includes(sector);
            if (!isValid) {
              console.warn(`❌ Invalid sector "${sector}" - not in allowed list`);
            }
            return isValid;
          });

          result.sectors = validSectors;
        }

        // Validate and filter flexibility options to only allow predefined ones
        if (result.schedule?.flexibility && result.schedule.flexibility.length > 0) {


          const validFlexibility = result.schedule.flexibility.filter(option => {
            const isValid = FLEXIBILITY_SELECT_OPTIONS.includes(option);
            if (!isValid) {
              console.warn(`❌ Invalid flexibility option "${option}" - not in allowed list`);
            }
            return isValid;
          });

          result.schedule.flexibility = validFlexibility;
        }

        // Validate and filter skills to only allow predefined ones from API
        if (result.skills) {


          // Only validate if skills are loaded from API
          if (professionalSkills.length > 0 && technicalSkills.length > 0 && softSkills.length > 0) {


            // Helper function to find best match for a skill
            const findBestSkillMatch = (skillName: string, skillArray: any[]) => {
              // Try exact match first
              let found = skillArray.find(s => s.name === skillName);

              // If not found, try case-insensitive match
              if (!found) {
                found = skillArray.find(s => s.name.toLowerCase() === skillName.toLowerCase());
              }

              // If still not found, try partial match
              if (!found) {
                found = skillArray.find(s =>
                  s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                  skillName.toLowerCase().includes(s.name.toLowerCase())
                );
              }

              return found;
            };

            // Validate and migrate professional skills
            if (result.skills.professional && result.skills.professional.length > 0) {
              const validProfessional = result.skills.professional.map(skill => {
                const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
                const found = findBestSkillMatch(skillName, professionalSkills);
                if (found) {
                  return {
                    skill: { $oid: found._id },
                    level: typeof skill === 'object' ? skill.level : 1,
                    details: typeof skill === 'object' ? skill.details : `Migrated from "${skillName}"`
                  };
                } else {
                  console.warn(`⚠️ Professional skill "${skillName}" not found in database - keeping as string`);
                  return skill; // Keep original format
                }
              });
              result.skills.professional = validProfessional;
            }

            // Validate and migrate technical skills
            if (result.skills.technical && result.skills.technical.length > 0) {
              const validTechnical = result.skills.technical.map(skill => {
                const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
                const found = findBestSkillMatch(skillName, technicalSkills);
                if (found) {
                  return {
                    skill: { $oid: found._id },
                    level: typeof skill === 'object' ? skill.level : 1,
                    details: typeof skill === 'object' ? skill.details : `Migrated from "${skillName}"`
                  };
                } else {
                  console.warn(`⚠️ Technical skill "${skillName}" not found in database - keeping as string`);
                  return skill; // Keep original format
                }
              });
              result.skills.technical = validTechnical;
            }

            // Validate and migrate soft skills
            if (result.skills.soft && result.skills.soft.length > 0) {
              const validSoft = result.skills.soft.map(skill => {
                const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
                const found = findBestSkillMatch(skillName, softSkills);
                if (found) {
                  return {
                    skill: { $oid: found._id },
                    level: typeof skill === 'object' ? skill.level : 1,
                  };
                } else {
                  console.warn(`⚠️ Soft skill "${skillName}" not found in database - keeping as string`);
                  return skill; // Keep original format
                }
              });
              result.skills.soft = validSoft;
            }
          } else {
          }
        }

        // Convert destination zones from country names to MongoDB ObjectIds
        if (result.destinationZones && result.destinationZones.length > 0) {

          const convertedZones = await Promise.all(result.destinationZones.map(async (zone) => {
            // If it's already a MongoDB ObjectId (24 characters), keep it
            if (typeof zone === 'string' && zone.length === 24) {
              return zone;
            }

            // If it's "Global", replace with France's MongoDB ObjectId
            if (typeof zone === 'string' && zone.toLowerCase() === 'global') {
              // Find France in allCountriesFromAPI
              const franceCountry = allCountriesFromAPI.find(c =>
                c.name.common.toLowerCase() === 'france' ||
                c.cca2 === 'FR'
              );
              return franceCountry ? franceCountry._id : zone;
            }

            // If it's an alpha-2 code, convert to MongoDB ObjectId
            if (typeof zone === 'string' && zone.length === 2 && /^[A-Z]{2}$/.test(zone)) {
              const country = allCountriesFromAPI.find(c => c.cca2 === zone);
              return country ? country._id : zone;
            }

            // If it's a country name, convert to MongoDB ObjectId
            if (typeof zone === 'string') {
              const country = allCountriesFromAPI.find(c =>
                c.name.common.toLowerCase() === zone.toLowerCase() ||
                c.name.official.toLowerCase() === zone.toLowerCase()
              );
              return country ? country._id : zone;
            }

            return zone;
          }));

          result.destinationZones = convertedZones;
        } else {
          // If no destination zones are provided, default to France's MongoDB ObjectId
          const franceCountry = allCountriesFromAPI.find(c =>
            c.name.common.toLowerCase() === 'france' ||
            c.cca2 === 'FR'
          );
          result.destinationZones = franceCountry ? [franceCountry._id] : [];
        }

        setSuggestions(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate suggestions"
        );
      } finally {
        setLoading(false);
        isGeneratingRef.current = false;
      }
    };

    if (props.input.trim() && !props.initialSuggestions) {
      generateSuggestions();
    }

    // Cleanup function to reset the generating flag
    return () => {
      isGeneratingRef.current = false;
    };
  }, [props.input]);

  // Memoized timezone options for the UI
  const timezoneOptions = React.useMemo(() => {
    return availableTimezones.length > 0
      ? availableTimezones.map(tz => ({
        _id: tz._id,
        zoneName: tz.name,
        countryName: tz.countryName,
        offset: tz.offset, // Include offset for GMT display
      }))
      : Object.entries(MAJOR_TIMEZONES).map(([code, { name, offset }]) => ({
        _id: `default_${code}`,
        zoneName: name,
        countryName: '',
        offset: offset,
      }));
  }, [availableTimezones]);

  // Auto-select first timezone when available timezones change
  useEffect(() => {
    if (!suggestions?.schedule || availableTimezones.length === 0) return;

    setSuggestions(prev => {
      if (!prev || !prev.schedule) return prev;
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          timeZones: [availableTimezones[0]._id],
          time_zone: availableTimezones[0]._id
        }
      };
    });
  }, [availableTimezones]); // Only depend on availableTimezones

  // Auto-select first job title when suggestions are loaded (only on initial load)
  useEffect(() => {
    if (suggestions?.jobTitles && suggestions.jobTitles.length > 0 && !selectedJobTitle) {
      // Only auto-select if no manual selection has been made
      setSelectedJobTitle(suggestions.jobTitles[0]);
    }
  }, [suggestions?.jobTitles]); // Remove selectedJobTitle from dependencies to prevent re-triggering

  // Re-validate skills when they are loaded from API
  useEffect(() => {
    if (!suggestions?.skills) return;
    if (professionalSkills.length > 0 && technicalSkills.length > 0 && softSkills.length > 0) {

      setSuggestions(prev => {
        if (!prev || !prev.skills) return prev;

        const newSuggestions = { ...prev };

        // Helper function to find best match for a skill
        const findBestSkillMatch = (skillName: string, skillArray: any[]) => {
          // Try exact match first
          let found = skillArray.find(s => s.name === skillName);

          // If not found, try case-insensitive match
          if (!found) {
            found = skillArray.find(s => s.name.toLowerCase() === skillName.toLowerCase());
          }

          // If still not found, try partial match
          if (!found) {
            found = skillArray.find(s =>
              s.name.toLowerCase().includes(skillName.toLowerCase()) ||
              skillName.toLowerCase().includes(s.name.toLowerCase())
            );
          }

          return found;
        };

        // Validate and migrate professional skills
        if (newSuggestions.skills.professional && newSuggestions.skills.professional.length > 0) {
          const validProfessional = newSuggestions.skills.professional.map(skill => {
            const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
            const found = findBestSkillMatch(skillName, professionalSkills);
            if (found) {
              return {
                skill: { $oid: found._id },
                level: typeof skill === 'object' ? skill.level : 1,
                details: typeof skill === 'object' ? skill.details : `Migrated from "${skillName}"`
              };
            } else {
              console.warn(`⚠️ Re-validation: Professional skill "${skillName}" not found in database - keeping as string`);
              return skill; // Keep original format
            }
          });
          newSuggestions.skills.professional = validProfessional;
        }

        // Validate and migrate technical skills
        if (newSuggestions.skills.technical && newSuggestions.skills.technical.length > 0) {
          const validTechnical = newSuggestions.skills.technical.map(skill => {
            const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
            const found = findBestSkillMatch(skillName, technicalSkills);
            if (found) {
              return {
                skill: { $oid: found._id },
                level: typeof skill === 'object' ? skill.level : 1,
                details: typeof skill === 'object' ? skill.details : `Migrated from "${skillName}"`
              };
            } else {
              console.warn(`⚠️ Re-validation: Technical skill "${skillName}" not found in database - keeping as string`);
              return skill; // Keep original format
            }
          });
          newSuggestions.skills.technical = validTechnical;
        }

        // Validate and migrate soft skills
        if (newSuggestions.skills.soft && newSuggestions.skills.soft.length > 0) {
          const validSoft = newSuggestions.skills.soft.map(skill => {
            const skillName = typeof skill === 'string' ? skill : (typeof skill.skill === 'string' ? skill.skill : skill.skill.$oid);
            const found = findBestSkillMatch(skillName, softSkills);
            if (found) {
              return {
                skill: { $oid: found._id },
                level: typeof skill === 'object' ? skill.level : 1,
              };
            } else {
              console.warn(`⚠️ Re-validation: Soft skill "${skillName}" not found in database - keeping as string`);
              return skill; // Keep original format
            }
          });
          newSuggestions.skills.soft = validSoft;
        }

        return newSuggestions;
      });
    }
  }, [professionalSkills, technicalSkills, softSkills]); // Removed suggestions dependency to prevent infinite loop

  const handleConfirm = () => {
    if (suggestions) {
      // Final migration to ensure all skills are in ObjectId format
      const finalMigration = () => {
        if (!suggestions.skills) return suggestions;

        let needsUpdate = false;
        const migratedSkills = { ...suggestions.skills };

        ['soft', 'professional', 'technical'].forEach(type => {
          const skillArray = migratedSkills[type as keyof typeof migratedSkills];
          if (skillArray && Array.isArray(skillArray)) {
            (migratedSkills as any)[type] = skillArray.map((skill: any) => {
              // Helper function to find skill by name
              const findSkillByName = (skillName: string, skillType: string) => {
                let skillArray: any[] = [];
                switch (skillType) {
                  case 'soft': skillArray = softSkills; break;
                  case 'professional': skillArray = professionalSkills; break;
                  case 'technical': skillArray = technicalSkills; break;
                  default: skillArray = [];
                }

                // Try exact match first
                let found = skillArray.find(s => s.name === skillName);

                // If not found, try case-insensitive match
                if (!found) {
                  found = skillArray.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                }

                // If still not found, try partial match
                if (!found) {
                  found = skillArray.find(s =>
                    s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                    skillName.toLowerCase().includes(s.name.toLowerCase())
                  );
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
          }
        });

        if (needsUpdate) {
          return { ...suggestions, skills: migratedSkills };
        }

        return suggestions;
      };

      const finalSuggestions = finalMigration();

      // Add selected job title to the final suggestions
      const suggestionsWithSelectedTitle: GigSuggestion = {
        ...finalSuggestions,
        selectedJobTitle: selectedJobTitle || undefined
      };

      props.onConfirm(suggestionsWithSelectedTitle);
    }
  };

  // Helper function to get country name from API ID or alpha-2 code
  const getCountryName = (countryId: string): string => {
    // First check if it's an API ID (MongoDB ObjectId format)
    if (countryId && countryId.length === 24) {
      const country = allCountriesFromAPI.find(c => c._id === countryId);
      if (country) {
        return country.name.common;
      }
    }

    // Then check our predefined list (for backward compatibility)
    if (DESTINATION_ZONES[countryId]) {
      return DESTINATION_ZONES[countryId];
    }

    // Then check the fetched countries by cca2 (for backward compatibility)
    const country = allCountries.find(c => c.cca2 === countryId);
    if (country) {
      return country.name.common;
    }

    return countryId;
  };

  // Helper function to get territory name by ID
  const getTerritoryName = (territoryId: string): string => {
    // First check if we have the name in our resolved names cache
    if (territoryNames[territoryId]) {
      return territoryNames[territoryId];
    }

    // Then check if it's an API ID (MongoDB ObjectId format) in loaded territories
    if (territoryId && territoryId.length === 24) {
      const country = territoriesFromAPI.find(c => c._id === territoryId);
      if (country) {
        return country.name.common;
      }
    }
    // Fallback to display the ID as-is (for backward compatibility)
    return territoryId;
  };

  // Helper function to search for countries by name
  const searchCountries = async (searchTerm: string): Promise<CountryData[]> => {
    if (!searchTerm || searchTerm.length < 2) return [];

    setSearching(true);
    try {
      const countries = await fetchAllCountries();
      // Filter countries by search term
      const filtered = countries.filter(country =>
        country.name.common.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.name.official.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Convert to expected format
      const data = filtered.map(country => ({
        name: {
          common: country.name.common,
          official: country.name.official
        },
        cca2: country.cca2
      }));

      return data;
    } catch (error) {
      console.error('❌ Error searching countries:', error);
      return [];
    } finally {
      setSearching(false);
    }
    return [];
  };

  // Helper function to get alpha-2 code from country name (synchronous version for UI)
  const getAlpha2CodeSync = (countryName: string): string => {

    // First check our predefined list
    const predefinedCode = Object.keys(DESTINATION_ZONES).find(
      code => DESTINATION_ZONES[code] === countryName
    );
    if (predefinedCode) {
      return predefinedCode;
    }

    // Then check the fetched countries
    const country = allCountries.find(c => c.name.common === countryName);
    if (country) {
      return country.cca2;
    }

    return countryName;
  };

  // Helper function to get alpha-2 code from country name (async version for API calls)
  const getAlpha2Code = async (countryName: string): Promise<string> => {

    // First check our predefined list
    const predefinedCode = Object.keys(DESTINATION_ZONES).find(
      code => DESTINATION_ZONES[code] === countryName
    );
    if (predefinedCode) {
      return predefinedCode;
    }

    // Then check the fetched countries
    const country = allCountries.find(c => c.name.common === countryName);
    if (country) {
      return country.cca2;
    }

    // If not found, try to fetch from our API
    try {
      const countries = await fetchAllCountries();
      const country = countries.find(c =>
        c.name.common.toLowerCase() === countryName.toLowerCase() ||
        c.name.official.toLowerCase() === countryName.toLowerCase()
      );

      if (country) {
        return country.cca2;
      }
    } catch (error) {
      console.error('❌ Error fetching from API:', error);
    }

    return countryName;
  };

  const addItem = (section: string, item: string) => {
    if (!suggestions) return;

    const newSuggestions = { ...suggestions };

    switch (section) {
      case "highlights":
        newSuggestions.highlights = [
          ...(newSuggestions.highlights || []),
          item,
        ];
        break;
      case "jobTitles":
        newSuggestions.jobTitles = [...(newSuggestions.jobTitles || []), item];
        break;
      case "deliverables":
        newSuggestions.deliverables = [
          ...(newSuggestions.deliverables || []),
          item,
        ];
        break;
      case "industries":
        // Convert industry name to ID
        const industryId = industries.find(i => i.label === item)?.value;
        if (industryId) {
          newSuggestions.industries = [...(newSuggestions.industries || []), industryId];
        } else {
          console.warn(`Industry "${item}" not found in available options. Skipping.`);
        }
        break;
      case "activities":
        // Convert activity name to ID
        const activityId = activities.find(a => a.label === item)?.value;
        if (activityId) {
          newSuggestions.activities = [...(newSuggestions.activities || []), activityId];
        } else {
          console.warn(`Activity "${item}" not found in available options. Skipping.`);
        }
        break;
      case "languages":
        // Convert language name to ID
        const languageId = languages.find(l => l.label === item)?.value;
        if (languageId) {
          newSuggestions.skills.languages = [
            ...(newSuggestions.skills.languages || []),
            { language: languageId, proficiency: 'B1', iso639_1: 'en' }
          ];
        } else {
          console.warn(`Language "${item}" not found in available options. Skipping.`);
        }
        break;
      case "sectors":
        // Validate that the sector is in the allowed list
        if (predefinedOptions.sectors.includes(item)) {
          newSuggestions.sectors = [...(newSuggestions.sectors || []), item];
        } else {
          console.warn(`Sector "${item}" is not in the allowed list. Skipping.`);
        }
        break;
      case "destinationZones":
        // For destination zones, we store the MongoDB ObjectId

        // If someone tries to add "Global", replace with "France"
        if (item.toLowerCase() === 'global') {
          item = 'France';
        }

        // Find the country by name or code and get its MongoDB ObjectId
        let countryId = item;
        if (item.length === 2) {
          // It's an alpha-2 code, find the corresponding MongoDB ObjectId
          const country = allCountriesFromAPI.find(c => c.cca2 === item);
          countryId = country ? country._id : item;
        } else {
          // It's a country name, find the corresponding MongoDB ObjectId
          const country = allCountriesFromAPI.find(c =>
            c.name.common.toLowerCase() === item.toLowerCase() ||
            c.name.official.toLowerCase() === item.toLowerCase()
          );
          countryId = country ? country._id : item;
        }

        newSuggestions.destinationZones = [
          ...(newSuggestions.destinationZones || []),
          countryId,
        ];

        break;
      case "requirements.essential":
        newSuggestions.requirements.essential = [
          ...(newSuggestions.requirements.essential || []),
          item,
        ];
        break;
      case "requirements.preferred":
        newSuggestions.requirements.preferred = [
          ...(newSuggestions.requirements.preferred || []),
          item,
        ];
        break;
      case "skills.technical":
        newSuggestions.skills.technical = [
          ...(newSuggestions.skills.technical || []),
          { skill: { $oid: item }, level: 1 },
        ];
        break;
      case "skills.soft":
        newSuggestions.skills.soft = [
          ...(newSuggestions.skills.soft || []),
          { skill: { $oid: item }, level: 1 },
        ];
        break;
      case "skills.languages":
        newSuggestions.skills.languages = [
          ...(newSuggestions.skills.languages || []),
          { language: item, proficiency: "Intermediate", iso639_1: "en" },
        ];
        break;
    }

    setSuggestions(newSuggestions);
  };

  const updateItem = (section: string, index: number, newValue: string) => {
    if (!suggestions) return;

    const newSuggestions = { ...suggestions };

    switch (section) {
      case "highlights":
        newSuggestions.highlights[index] = newValue;
        break;
      case "jobTitles":
        newSuggestions.jobTitles[index] = newValue;
        break;
      case "deliverables":
        newSuggestions.deliverables[index] = newValue;
        break;
      case "industries":
        // Convert industry name to ID
        const industryId = industries.find(i => i.label === newValue)?.value;
        if (industryId) {
          newSuggestions.industries[index] = industryId;
        } else {
          console.warn(`Industry "${newValue}" not found in available options. Skipping update.`);
        }
        break;
      case "activities":
        // Convert activity name to ID
        const activityId = activities.find(a => a.label === newValue)?.value;
        if (activityId) {
          newSuggestions.activities[index] = activityId;
        } else {
          console.warn(`Activity "${newValue}" not found in available options. Skipping update.`);
        }
        break;
      case "sectors":
        // Validate that the sector is in the allowed list
        if (predefinedOptions.sectors.includes(newValue)) {
          newSuggestions.sectors[index] = newValue;
        } else {
          console.warn(`Sector "${newValue}" is not in the allowed list. Skipping update.`);
        }
        break;
      case "destinationZones":
        // For destination zones, we store the MongoDB ObjectId

        // If someone tries to update to "Global", replace with "France"
        if (newValue.toLowerCase() === 'global') {
          newValue = 'France';
        }

        // Find the country by name or code and get its MongoDB ObjectId
        let countryId = newValue;
        if (newValue.length === 2) {
          // It's an alpha-2 code, find the corresponding MongoDB ObjectId
          const country = allCountriesFromAPI.find(c => c.cca2 === newValue);
          countryId = country ? country._id : newValue;
        } else {
          // It's a country name, find the corresponding MongoDB ObjectId
          const country = allCountriesFromAPI.find(c =>
            c.name.common.toLowerCase() === newValue.toLowerCase() ||
            c.name.official.toLowerCase() === newValue.toLowerCase()
          );
          countryId = country ? country._id : newValue;
        }

        newSuggestions.destinationZones[index] = countryId;
        break;
      case "requirements.essential":
        newSuggestions.requirements.essential[index] = newValue;
        break;
      case "requirements.preferred":
        newSuggestions.requirements.preferred[index] = newValue;
        break;
      case "skills.technical":
        newSuggestions.skills.technical[index] = {
          skill: { $oid: newValue },
          level: newSuggestions.skills.technical[index].level,
        };
        break;
      case "skills.soft":
        newSuggestions.skills.soft[index] = {
          skill: { $oid: newValue },
          level: newSuggestions.skills.soft[index].level,
        };
        break;
      case "skills.languages":
        const currentLang = newSuggestions.skills.languages[index];
        newSuggestions.skills.languages[index] = {
          language: newValue,
          proficiency: currentLang.proficiency,
          iso639_1: currentLang.iso639_1 || "en",
        };
        break;
    }

    setSuggestions(newSuggestions);
  };

  const deleteItem = (section: string, index: number) => {
    if (!suggestions) return;

    const newSuggestions = { ...suggestions };

    switch (section) {
      case "highlights":
        newSuggestions.highlights = newSuggestions.highlights.filter(
          (_, i) => i !== index
        );
        break;
      case "jobTitles":
        newSuggestions.jobTitles = newSuggestions.jobTitles.filter(
          (_, i) => i !== index
        );
        break;
      case "deliverables":
        newSuggestions.deliverables = newSuggestions.deliverables.filter(
          (_, i) => i !== index
        );
        break;
      case "industries":
        newSuggestions.industries = newSuggestions.industries.filter(
          (_, i) => i !== index
        );
        break;
      case "activities":
        newSuggestions.activities = newSuggestions.activities.filter(
          (_, i) => i !== index
        );
        break;
      case "sectors":
        newSuggestions.sectors = newSuggestions.sectors.filter(
          (_, i) => i !== index
        );
        break;
      case "destinationZones":
        newSuggestions.destinationZones =
          newSuggestions.destinationZones.filter((_, i) => i !== index);
        break;
      case "requirements.essential":
        newSuggestions.requirements.essential =
          newSuggestions.requirements.essential.filter((_, i) => i !== index);
        break;
      case "requirements.preferred":
        newSuggestions.requirements.preferred =
          newSuggestions.requirements.preferred.filter((_, i) => i !== index);
        break;
      case "skills.technical":
        newSuggestions.skills.technical =
          newSuggestions.skills.technical.filter((_, i) => i !== index);
        break;
      case "skills.soft":
        newSuggestions.skills.soft = newSuggestions.skills.soft.filter(
          (_, i) => i !== index
        );
        break;
      case "skills.languages":
        newSuggestions.skills.languages =
          newSuggestions.skills.languages.filter((_, i) => i !== index);
        break;
    }

    setSuggestions(newSuggestions);
  };

  const startEditing = (section: string, index: number, currentValue: any) => {
    setEditingSection(section);
    setEditingIndex(index);
    if (typeof currentValue === "string") {
      // For destination zones, convert alpha-2 code to country name for editing
      if (section === "destinationZones") {
        const countryName = getCountryName(currentValue);
        setEditValue(countryName);
      } else {
        setEditValue(currentValue);
      }
    } else if (currentValue && typeof currentValue === "object") {
      // Handle skill objects with $oid
      if (currentValue.skill) {
        if (typeof currentValue.skill === 'string') {
          setEditValue(currentValue.skill);
        } else if (currentValue.skill && typeof currentValue.skill === 'object' && currentValue.skill.$oid) {
          setEditValue(currentValue.skill.$oid);
        } else {
          setEditValue("");
        }
      } else if (currentValue.language) {
        setEditValue(currentValue.language);
      } else {
        setEditValue("");
      }
    } else {
      setEditValue("");
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditingIndex(null);
    setEditValue("");
    setSearchResults([]);
  };

  const renderEditableList = (section: string, items: any[], title: string) => {
    const currentItems = items || [];

    return (
      <div className="mb-6">
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => {
              setEditingSection(section);
              setEditingIndex(-1);
              setEditValue("");
            }}
            className="flex items-center space-x-1 text-harx-700 hover:text-harx-900 font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>

        {currentItems.length > 0 && (
          <div className="space-y-3">
            {currentItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
              >
                {editingSection === section && editingIndex === index ? (
                  <div className="flex items-center space-x-2 flex-1">
                    {section === "destinationZones" ? (
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setEditValue(value);

                            // Search for countries if user types something
                            if (value.length >= 2) {
                              const results = await searchCountries(value);
                              setSearchResults(results);
                            } else {
                              setSearchResults([]);
                            }
                          }}
                          onBlur={() => {
                            if (editValue.trim()) {
                              updateItem(section, index, editValue);
                            }
                            setEditingSection(null);
                            setEditingIndex(null);
                            setEditValue("");
                            setSearchResults([]);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editValue.trim()) {
                                updateItem(section, index, editValue);
                              }
                              setEditingSection(null);
                              setEditingIndex(null);
                              setEditValue("");
                              setSearchResults([]);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          placeholder="Type to search countries..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                          autoFocus
                        />
                        {searching && (
                          <div className="mt-2 text-sm text-gray-500 flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Searching countries...
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                            {searchResults.map((country) => (
                              <button
                                key={country.cca2}
                                type="button"
                                onClick={() => {
                                  setEditValue(country.name.common);
                                  setSearchResults([]);
                                  updateItem(section, index, country.name.common);
                                  setEditingSection(null);
                                  setEditingIndex(null);
                                  setEditValue("");
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium">{country.name.common}</div>
                                <div className="text-sm text-gray-500">{country.cca2}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : section === "sectors" || section === "industries" || section === "activities" ? (
                      <select
                        value={editValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditValue(value);
                          if (value) {
                            updateItem(section, index, value);
                            setEditingSection(null);
                            setEditingIndex(null);
                            setEditValue("");
                          }
                        }}
                        onBlur={() => {
                          setEditingSection(null);
                          setEditingIndex(null);
                          setEditValue("");
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                        autoFocus
                      >
                        <option value="">Select a {section === "sectors" ? "sector" : section === "industries" ? "industry" : "activity"}...</option>
                        {(section === "sectors" ? predefinedOptions.sectors : section === "industries" ? predefinedOptions.industries : predefinedOptions.activities).filter((item: string) => {
                          // When editing, include the current item being edited
                          if (editingIndex >= 0 && currentItems[editingIndex] === item) {
                            return true;
                          }
                          // Otherwise, exclude items that are already selected
                          return !currentItems.includes(item);
                        }).map((item: string) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          if (editValue.trim()) {
                            updateItem(section, index, editValue);
                          }
                          setEditingSection(null);
                          setEditingIndex(null);
                          setEditValue("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editValue.trim()) {
                              updateItem(section, index, editValue);
                            }
                            setEditingSection(null);
                            setEditingIndex(null);
                            setEditValue("");
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                        autoFocus
                      />
                    )}
                    <button
                      onClick={cancelEditing}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      title="Cancel (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="text-gray-700 flex-1 font-medium cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                      onClick={() => startEditing(section, index, item)}
                    >
                      {typeof item === "string"
                        ? section === "destinationZones"
                          ? (() => {
                            const countryName = getCountryName(item);
                            return (
                              <div className="flex items-center space-x-2">
                                <span>{countryName}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {item}
                                </span>
                              </div>
                            );
                          })()
                          : item
                        : item?.skill || item?.language || ""}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteItem(section, index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {editingSection === section && editingIndex === -1 && (
          <div className="flex items-center space-x-3 mt-4">
            {section === "destinationZones" ? (
              <div className="flex-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setEditValue(value);

                    // Search for countries if user types something
                    if (value.length >= 2) {
                      const results = await searchCountries(value);
                      setSearchResults(results);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  onBlur={() => {
                    if (editValue.trim()) {
                      addItem(section, editValue.trim());
                    }
                    setEditValue("");
                    setEditingSection(null);
                    setEditingIndex(null);
                    setSearchResults([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue.trim()) {
                        addItem(section, editValue.trim());
                      }
                      setEditValue("");
                      setEditingSection(null);
                      setEditingIndex(null);
                      setSearchResults([]);
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  placeholder="Type to search countries..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  autoFocus
                />
                {searching && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Searching countries...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    {searchResults.map((country) => (
                      <button
                        key={country.cca2}
                        type="button"
                        onClick={() => {
                          addItem(section, country.name.common);
                          setEditValue("");
                          setEditingSection(null);
                          setEditingIndex(null);
                          setSearchResults([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{country.name.common}</div>
                        <div className="text-sm text-gray-500">{country.cca2}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : section === "sectors" || section === "industries" || section === "activities" ? (
              <select
                value={editValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditValue(value);
                  if (value) {
                    addItem(section, value);
                    setEditValue("");
                    setEditingSection(null);
                    setEditingIndex(null);
                  }
                }}
                onBlur={() => {
                  setEditingSection(null);
                  setEditingIndex(null);
                  setEditValue("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                autoFocus
              >
                <option value="">Select a {section === "sectors" ? "sector" : section === "industries" ? "industry" : "activity"}...</option>
                {(section === "sectors" ? predefinedOptions.sectors : section === "industries" ? predefinedOptions.industries : predefinedOptions.activities).filter((item: string) => {
                  // When editing, include the current item being edited
                  if (editingIndex >= 0 && currentItems[editingIndex] === item) {
                    return true;
                  }
                  // Otherwise, exclude items that are already selected
                  return !currentItems.includes(item);
                }).map(
                  (item: string) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  )
                )}
              </select>
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  if (editValue.trim()) {
                    addItem(section, editValue.trim());
                  }
                  setEditValue("");
                  setEditingSection(null);
                  setEditingIndex(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editValue.trim()) {
                      addItem(section, editValue.trim());
                    }
                    setEditValue("");
                    setEditingSection(null);
                    setEditingIndex(null);
                  } else if (e.key === 'Escape') {
                    cancelEditing();
                  }
                }}
                placeholder={`Add a new ${title.toLowerCase()}`}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                autoFocus
              />
            )}
            <button
              onClick={cancelEditing}
              className="text-gray-500 hover:text-gray-700 p-2"
              title="Cancel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const formatTime24 = (time: string) => {
    if (!time || !time.includes(":")) return time;
    let [hoursStr, minutesStr] = time.split(":");
    return `${hoursStr}h${minutesStr}`;
  };

  const renderEditableSchedules = () => {
    if (!suggestions?.schedule) return null;

    const groupedSchedules = (suggestions.schedule.schedules || []).reduce(
      (groups, schedule) => {
        // Ignorer les schedules avec des jours vides
        if (!schedule.day || schedule.day.trim() === "") return groups;

        const key = `${schedule.hours.start}-${schedule.hours.end}`;
        if (!groups[key]) {
          groups[key] = { hours: schedule.hours, days: [] };
        }
        groups[key].days.push(schedule.day);
        return groups;
      },
      {} as Record<string, GroupedSchedule>
    );

    const allWeekDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Trouver les groupes vides (schedules avec des jours vides)
    const emptySchedules = suggestions.schedule.schedules.filter(
      schedule => !schedule.day || schedule.day.trim() === ""
    );

    // Vérifier si tous les jours sont déjà sélectionnés
    const selectedDays = suggestions.schedule.schedules
      .filter(schedule => schedule.day && schedule.day.trim() !== "")
      .map(schedule => schedule.day);

    const allDaysSelected = allWeekDays.every(day => selectedDays.includes(day));

    const addNewScheduleGroup = () => {
      if (!suggestions) return;

      // Cherche un horaire non utilisé
      const defaultHoursList = [
        { start: "09:00", end: "17:00" },
        { start: "07:00", end: "15:00" },
        { start: "11:00", end: "19:00" },
        { start: "14:00", end: "22:00" },
      ];
      const usedHours = suggestions.schedule.schedules.map(s => `${s.hours.start}-${s.hours.end}`);
      const availableHours = defaultHoursList.find(
        h => !usedHours.includes(`${h.start}-${h.end}`)
      ) || { start: "09:00", end: "17:00" };

      // Créer un nouveau groupe avec des horaires mais sans jours sélectionnés
      const newSchedule: ScheduleEntry = {
        day: "", // Jour vide - aucun jour sélectionné par défaut
        hours: availableHours,
        _id: {
          $oid: `generated_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        },
      };

      const newSuggestions = {
        ...suggestions,
        schedule: {
          ...suggestions.schedule,
          schedules: [...suggestions.schedule.schedules, newSchedule],
        },
      };
      setSuggestions(newSuggestions);
    };

    const handleDayToggle = (
      dayToToggle: string,
      groupHours: { start: string; end: string }
    ) => {
      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
        (s: ScheduleEntry) => s.day === dayToToggle
      );

      if (scheduleIndex > -1) {
        const currentHours =
          newSuggestions.schedule.schedules[scheduleIndex].hours;
        if (
          currentHours.start === groupHours.start &&
          currentHours.end === groupHours.end
        ) {
          newSuggestions.schedule.schedules.splice(scheduleIndex, 1);
        } else {
          newSuggestions.schedule.schedules[scheduleIndex].hours = groupHours;
        }
      } else {
        newSuggestions.schedule.schedules.push({
          day: dayToToggle,
          hours: groupHours,
          _id: {
            $oid: `generated_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          },
        });
      }
      setSuggestions(newSuggestions);
    };

    const handleHoursChange = (
      group: GroupedSchedule,
      field: "start" | "end",
      value: string
    ) => {
      // Allow free typing, validation happens later
      // if (field === "end" && value < group.hours.start) return;

      const newSuggestions = JSON.parse(JSON.stringify(suggestions));

      // If Start > End, we will also update End
      let shouldUpdateEnd = false;
      if (field === "start" && value > group.hours.end) {
        shouldUpdateEnd = true;
      }

      group.days.forEach((day: string) => {
        const schedule = newSuggestions.schedule.schedules.find(
          (s: ScheduleEntry) => s.day === day
        );
        if (schedule) {
          schedule.hours[field] = value;
          if (shouldUpdateEnd) {
            schedule.hours.end = value;
          }
        }
      });
      setSuggestions(newSuggestions);
    };

    const handlePresetClick = (group: GroupedSchedule, preset: string) => {
      let newHours;
      switch (preset) {
        case "9-5":
          newHours = { start: "09:00", end: "17:00" };
          break;
        case "Early":
          newHours = { start: "07:00", end: "15:00" };
          break;
        case "Late":
          newHours = { start: "11:00", end: "19:00" };
          break;
        case "Evening":
          newHours = { start: "14:00", end: "22:00" };
          break;
        default:
          newHours = group.hours;
      }

      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      group.days.forEach((day: string) => {
        const schedule = newSuggestions.schedule.schedules.find(
          (s: ScheduleEntry) => s.day === day
        );
        if (schedule) {
          schedule.hours = newHours;
        }
      });
      setSuggestions(newSuggestions);
    };

    const handleEmptyScheduleDayToggle = (dayToToggle: string, emptySchedule: ScheduleEntry) => {
      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
        (s: ScheduleEntry) => s._id?.$oid === emptySchedule._id?.$oid
      );

      if (scheduleIndex > -1) {
        newSuggestions.schedule.schedules[scheduleIndex].day = dayToToggle;
      }
      setSuggestions(newSuggestions);
    };

    const handleEmptyScheduleHoursChange = (emptySchedule: ScheduleEntry, field: "start" | "end", value: string) => {
      // Allow free typing, validation happens on save/confirm if needed
      // if (field === "end" && value < emptySchedule.hours.start) return;

      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
        (s: ScheduleEntry) => s._id?.$oid === emptySchedule._id?.$oid
      );

      if (scheduleIndex > -1) {
        newSuggestions.schedule.schedules[scheduleIndex].hours[field] = value;
        // If Start > End, update End as well
        if (field === "start" && value > newSuggestions.schedule.schedules[scheduleIndex].hours.end) {
          newSuggestions.schedule.schedules[scheduleIndex].hours.end = value;
        }
      }
      setSuggestions(newSuggestions);
    };

    const handleEmptySchedulePresetClick = (emptySchedule: ScheduleEntry, preset: string) => {
      let newHours;
      switch (preset) {
        case "9-5":
          newHours = { start: "09:00", end: "17:00" };
          break;
        case "Early":
          newHours = { start: "07:00", end: "15:00" };
          break;
        case "Late":
          newHours = { start: "11:00", end: "19:00" };
          break;
        case "Evening":
          newHours = { start: "14:00", end: "22:00" };
          break;
        default:
          newHours = emptySchedule.hours;
      }

      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
        (s: ScheduleEntry) => s._id?.$oid === emptySchedule._id?.$oid
      );

      if (scheduleIndex > -1) {
        newSuggestions.schedule.schedules[scheduleIndex].hours = newHours;
      }
      setSuggestions(newSuggestions);
    };

    const deleteEmptySchedule = (emptySchedule: ScheduleEntry) => {
      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
        (s: ScheduleEntry) => s._id?.$oid === emptySchedule._id?.$oid
      );

      if (scheduleIndex > -1) {
        newSuggestions.schedule.schedules.splice(scheduleIndex, 1);
        setSuggestions(newSuggestions);
      }
    };

    const deleteScheduleGroup = (groupHours: { start: string; end: string }) => {
      const newSuggestions = JSON.parse(JSON.stringify(suggestions));
      const schedulesToRemove = newSuggestions.schedule.schedules.filter(
        (s: ScheduleEntry) => s.hours.start === groupHours.start && s.hours.end === groupHours.end
      );

      schedulesToRemove.forEach((schedule: ScheduleEntry) => {
        const scheduleIndex = newSuggestions.schedule.schedules.findIndex(
          (s: ScheduleEntry) => s._id?.$oid === schedule._id?.$oid
        );
        if (scheduleIndex > -1) {
          newSuggestions.schedule.schedules.splice(scheduleIndex, 1);
        }
      });

      setSuggestions(newSuggestions);
    };

    return (
      <div className="space-y-4">
        {Object.keys(groupedSchedules).length > 0 ? (
          Object.entries(groupedSchedules).map(([key, group]) => (
            <div
              key={group.days.slice().sort().join('-')}
              className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-semibold text-gray-800 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-harx-500" />
                  Working Days
                </h5>
                <button
                  onClick={() => deleteScheduleGroup(group.hours)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete schedule group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-2 mb-3">
                {allWeekDays.map((day) => {
                  const isSelected = group.days.includes(day);
                  const isInOtherGroup = !isSelected && suggestions.schedule.schedules.some((s) => s.day === day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day, group.hours)}
                      disabled={isInOtherGroup}
                      className={`rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 shadow-sm
                        ${isSelected ? 'bg-harx-alt-600 text-white shadow' : isInOtherGroup ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-harx-alt-100 hover:text-harx-alt-700'}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-harx-600" />
                  Working Hours
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                      <Sunrise className="w-3 h-3 mr-1 text-harx-400" />
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={group.hours.start}
                      onChange={(e) =>
                        handleHoursChange(group, "start", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                      <Sunset className="w-3 h-3 mr-1 text-harx-alt-400" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={group.hours.end}
                      onChange={(e) =>
                        handleHoursChange(group, "end", e.target.value)
                      }
                      min={group.hours.start}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500"
                    />
                  </div>
                </div>

                <div className="text-center bg-white border border-gray-200 rounded-lg p-2 mb-4">
                  <span className="font-semibold text-gray-700 text-sm">
                    {formatTime24(group.hours.start)} -{" "}
                    {formatTime24(group.hours.end)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handlePresetClick(group, "9-5")}
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                  >
                    <Sun className="w-4 h-4 text-yellow-500 mb-1" />
                    <span className="text-xs font-medium text-gray-600">
                      9-5
                    </span>
                  </button>
                  <button
                    onClick={() => handlePresetClick(group, "Early")}
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                  >
                    <Sunrise className="w-4 h-4 text-harx-500 mb-1" />
                    <span className="text-xs font-medium text-gray-600">
                      Early
                    </span>
                  </button>
                  <button
                    onClick={() => handlePresetClick(group, "Late")}
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                  >
                    <Clock className="w-4 h-4 text-harx-alt-500 mb-1" />
                    <span className="text-xs font-medium text-gray-600">
                      Late
                    </span>
                  </button>
                  <button
                    onClick={() => handlePresetClick(group, "Evening")}
                    className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                  >
                    <Moon className="w-4 h-4 text-harx-alt-500 mb-1" />
                    <span className="text-xs font-medium text-gray-600">
                      Evening
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : null}

        {/* Afficher les groupes vides */}
        {emptySchedules.map((emptySchedule, index) => (
          <div
            key={`empty-schedule-${index}`}
            className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-semibold text-gray-600">
                New Schedule Group (No days selected)
              </h5>
              <button
                onClick={() => deleteEmptySchedule(emptySchedule)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1 mb-4">
              {allWeekDays.map((day) => {
                const isSelected = emptySchedule.day === day;
                const isInOtherGroup = suggestions.schedule.schedules.some((s) => s.day === day);
                return (
                  <button
                    key={day}
                    onClick={() => handleEmptyScheduleDayToggle(day, emptySchedule)}
                    disabled={isInOtherGroup}
                    className={`rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 shadow-sm
                      ${isSelected ? 'bg-harx-600 text-white shadow' : isInOtherGroup ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-harx-100 hover:text-harx-700'}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-harx-600" />
                Working Hours
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                    <Sunrise className="w-3 h-3 mr-1 text-harx-400" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={emptySchedule.hours.start}
                    onChange={(e) =>
                      handleEmptyScheduleHoursChange(emptySchedule, "start", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                    <Sunset className="w-3 h-3 mr-1 text-harx-alt-400" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={emptySchedule.hours.end}
                    onChange={(e) =>
                      handleEmptyScheduleHoursChange(emptySchedule, "end", e.target.value)
                    }
                    min={emptySchedule.hours.start}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500"
                  />
                </div>
              </div>

              <div className="text-center bg-white border border-gray-200 rounded-lg p-2 mb-4">
                <span className="font-semibold text-gray-700 text-sm">
                  {formatTime24(emptySchedule.hours.start)} -{" "}
                  {formatTime24(emptySchedule.hours.end)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleEmptySchedulePresetClick(emptySchedule, "9-5")}
                  className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                >
                  <Sun className="w-4 h-4 text-yellow-500 mb-1" />
                  <span className="text-xs font-medium text-gray-600">
                    9-5
                  </span>
                </button>
                <button
                  onClick={() => handleEmptySchedulePresetClick(emptySchedule, "Early")}
                  className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                >
                  <Sunrise className="w-4 h-4 text-harx-500 mb-1" />
                  <span className="text-xs font-medium text-gray-600">
                    Early
                  </span>
                </button>
                <button
                  onClick={() => handleEmptySchedulePresetClick(emptySchedule, "Late")}
                  className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                >
                  <Clock className="w-4 h-4 text-harx-alt-500 mb-1" />
                  <span className="text-xs font-medium text-gray-600">
                    Late
                  </span>
                </button>
                <button
                  onClick={() => handleEmptySchedulePresetClick(emptySchedule, "Evening")}
                  className="flex flex-col items-center justify-center py-2 px-1 bg-white rounded-lg border border-gray-200 hover:border-harx-alt-400 hover:bg-harx-alt-50 transition-colors shadow-sm"
                >
                  <Moon className="w-4 h-4 text-harx-alt-500 mb-1" />
                  <span className="text-xs font-medium text-gray-600">
                    Evening
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Message si aucun planning n'est défini */}
        {Object.keys(groupedSchedules).length === 0 && emptySchedules.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No schedule defined.</p>
          </div>
        )}

        {/* Afficher le bouton seulement si tous les jours ne sont pas sélectionnés ET qu'il n'y a pas de groupes vides */}
        {!allDaysSelected && emptySchedules.length === 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={addNewScheduleGroup}
              className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-harx-alt-600 to-harx-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-harx-alt-700 hover:to-harx-700 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Add Schedule Group</div>
                  <div className="text-xs text-harx-alt-100 opacity-90">Create a new time slot</div>
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        )}

        {/* Message quand tous les jours sont sélectionnés ET qu'il n'y a pas de groupes vides */}
        {allDaysSelected && emptySchedules.length === 0 && (
          <div className="text-center mt-6 p-4 bg-harx-50 border border-harx-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-harx-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">All week days are scheduled!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              You can still modify existing schedules or remove days to add new groups.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderMinimumHoursSection = () => {
    if (!suggestions?.schedule) return null;

    const handleMinimumHoursChange = (field: 'daily' | 'weekly' | 'monthly', value: string) => {
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.schedule.minimumHours) {
        newSuggestions.schedule.minimumHours = { daily: 0, weekly: 0, monthly: 0 };
      }

      const numericValue = value ? parseInt(value, 10) : 0;
      newSuggestions.schedule.minimumHours[field] = numericValue;
      setSuggestions(newSuggestions);
    };

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-harx-alt-500" />
          <h4 className="text-lg font-semibold text-gray-900">Minimum Hours Requirements</h4>
        </div>

        <div className="space-y-4">
          {/* Hours Input Cards - Horizontal Layout */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Hours */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Daily Hours</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={suggestions.schedule.minimumHours?.daily || ''}
                    onChange={(e) => handleMinimumHoursChange('daily', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-alt-500 focus:border-harx-alt-500 bg-white transition-all duration-200"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">
                    hrs
                  </span>
                </div>
              </div>

              {/* Weekly Hours */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Weekly Hours</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={suggestions.schedule.minimumHours?.weekly || ''}
                    onChange={(e) => handleMinimumHoursChange('weekly', e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-alt-500 focus:border-harx-alt-500 bg-white transition-all duration-200"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">
                    hrs
                  </span>
                </div>
              </div>

              {/* Monthly Hours */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Monthly Hours</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="744"
                    value={suggestions.schedule.minimumHours?.monthly || ''}
                    onChange={(e) => handleMinimumHoursChange('monthly', e.target.value)}
                    placeholder="e.g. 160"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-alt-500 focus:border-harx-alt-500 bg-white transition-all duration-200"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">
                    hrs
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderTimezoneSection = () => {
    if (!suggestions?.schedule) return null;

    const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const newSuggestions = { ...suggestions };

      if (value) {
        // Find the selected timezone to get the _id
        const selectedTimezone = filteredTimezones.find(tz => tz._id === value);
        if (selectedTimezone) {
          newSuggestions.schedule.timeZones = [selectedTimezone._id];
          newSuggestions.schedule.time_zone = selectedTimezone._id;
        } else {
          newSuggestions.schedule.timeZones = [value]; // Fallback to string
          newSuggestions.schedule.time_zone = value;
        }
      } else {
        newSuggestions.schedule.timeZones = [];
        newSuggestions.schedule.time_zone = undefined;
      }

      setSuggestions(newSuggestions);
    };

    // Filter timezones based on search
    const filteredTimezones = availableTimezones.filter(tz =>
      tz.name && tz._id && (
        tz.name.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
        tz.countryName?.toLowerCase().includes(timezoneSearch.toLowerCase())
      )
    );

    // Get the first destination zone for display
    const firstDestination = suggestions.destinationZones?.[0];
    firstDestination ? getCountryName(firstDestination) : 'Unknown';

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Globe2 className="w-5 h-5 text-harx-alt-500" />
          <h4 className="text-lg font-semibold text-gray-900">Time Zone</h4>
        </div>

        {/* Search input */}
        {timezoneOptions.length > 0 && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search timezones by name, country, or abbreviation..."
              value={timezoneSearch}
              onChange={(e) => setTimezoneSearch(e.target.value)}
              className="w-full p-3 rounded-lg border border-purple-300 bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-harx-alt-400"
            />
          </div>
        )}

        <select
          className="w-full p-3 rounded-lg border border-purple-300 bg-white text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-harx-alt-400 mb-2"
          value={suggestions.schedule.time_zone || ''}
          onChange={handleTimezoneChange}
          disabled={timezoneLoading}
        >
          <option value="">Select a timezone...</option>
          {filteredTimezones.map((tz) => (
            <option key={tz._id} value={tz._id}>
              {tz.name} {tz.countryName ? `- ${tz.countryName}` : ''} (GMT{tz.offset >= 0 ? '+' : ''}{tz.offset})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 italic text-center mt-2">
          {availableTimezones.length > 0
            ? timezoneSearch
              ? `Showing ${filteredTimezones.length} of ${availableTimezones.length} timezones`
              : `${availableTimezones.length} timezones available worldwide`
            : timezoneLoading
              ? 'Loading timezones from API...'
              : 'No timezones available'
          }
        </p>
      </div>
    );
  };

  const renderDestinationZonesSection = () => {
    if (!suggestions) return null;

    const handleAddDestinationZone = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value; // This is the MongoDB ObjectId
      if (!value) return;

      // Use the existing addItem logic for destination zones
      addItem("destinationZones", value);

      // Reset select
      e.target.value = '';
    };

    const handleRemoveDestinationZone = (zone: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.destinationZones = newSuggestions.destinationZones.filter(z => z !== zone);
      setSuggestions(newSuggestions);
    };

    const selected = suggestions.destinationZones || [];

    // Get all available countries from API, excluding already selected ones
    const availableCountries = allCountriesFromAPI
      .filter(country => !selected.includes(country._id))
      .map(country => ({
        code: country._id,  // Use MongoDB ObjectId as the value
        name: country.name.common
      }));

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Destination Zones</h4>
        </div>

        {/* Select pour ajouter */}
        <select
          className="w-full p-3 rounded-lg border border-harx-300 bg-white text-harx-900 font-semibold focus:outline-none focus:ring-2 focus:ring-harx-400 mb-2"
          defaultValue=""
          onChange={handleAddDestinationZone}
          disabled={destinationCountriesLoading}
        >
          <option value="" disabled>
            {destinationCountriesLoading ? 'Loading countries...' : 'Add destination zone...'}
          </option>
          {availableCountries.map(({ code, name }) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>

        {/* Badges sélectionnés - displayed below the select */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-harx-200">
            {selected.map(zone => (
              <span key={zone} className="group relative flex items-center bg-harx-700 text-white text-sm font-medium pl-3 pr-2 py-1 rounded-full cursor-pointer hover:bg-harx-800 transition-colors">
                <span>{getCountryName(zone)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDestinationZone(zone)}
                  className="ml-2 text-white hover:text-harx-200 rounded-full focus:outline-none focus:bg-harx-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 italic text-center mt-2">
          {destinationCountriesLoading
            ? 'Loading countries from API...'
            : `${availableCountries.length} countries available for selection`
          }
        </p>
      </div>
    );
  };

  const renderJobTitlesSection = () => {
    if (!suggestions) return null;

    const handleAddJobTitle = () => {
      const value = newJobTitle.trim();
      if (!value) return;

      // Add the job title if it's not already in the list
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.jobTitles) newSuggestions.jobTitles = [];
      if (!newSuggestions.jobTitles.includes(value)) {
        newSuggestions.jobTitles = [...newSuggestions.jobTitles, value];
        setSuggestions(newSuggestions);
        // Auto-select the newly added job title
        setSelectedJobTitle(value);
        setNewJobTitle('');
        setShowJobTitleForm(false);
      }
    };

    const handleUpdateJobTitle = (index: number) => {
      const value = newJobTitle.trim();
      if (!value) return;

      const newSuggestions = { ...suggestions };
      if (newSuggestions.jobTitles) {
        const oldTitle = newSuggestions.jobTitles[index];
        newSuggestions.jobTitles[index] = value;
        setSuggestions(newSuggestions);
        // If the old title was selected, update selection to the new title
        if (selectedJobTitle === oldTitle) {
          setSelectedJobTitle(value);
        }
        setNewJobTitle('');
        setEditingJobTitleIndex(null);
      }
    };

    const handleRemoveJobTitle = (jobTitle: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.jobTitles = newSuggestions.jobTitles.filter(jt => jt !== jobTitle);
      setSuggestions(newSuggestions);
    };

    const handleEditClick = (title: string, index: number) => {
      setNewJobTitle(title);
      setEditingJobTitleIndex(index);
      setShowJobTitleForm(false);
    };

    const handleCancelEdit = () => {
      setNewJobTitle('');
      setEditingJobTitleIndex(null);
      setShowJobTitleForm(false);
    };

    const selected = suggestions.jobTitles || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-harx rounded-lg shadow-sm">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold bg-gradient-harx bg-clip-text text-transparent">Position Details</h4>
            <p className="text-sm text-gray-500">Define the role title and main responsibilities</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-harx-50 to-harx-alt-50 border border-harx-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-harx-100 rounded-full mt-0.5">
              <AlertCircle className="w-4 h-4 text-harx-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-harx-900">
                Start by providing the basic information about the contact center role. Be specific and clear about the position's requirements and responsibilities.
              </p>
            </div>
          </div>
        </div>

        {/* Job titles list */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-semibold text-gray-900">Available Job Titles</h5>
            <span className="text-sm text-gray-500">Click to select your main position</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {selected.map((title, index) => (
              <span key={index}>
                {editingJobTitleIndex === index ? (
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 border-harx-300 rounded-xl shadow-sm">
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUpdateJobTitle(index);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      onBlur={() => {
                        if (newJobTitle.trim()) {
                          handleUpdateJobTitle(index);
                        } else {
                          handleCancelEdit();
                        }
                      }}
                      className="bg-transparent border-none outline-none text-sm font-semibold text-harx-800 min-w-0 flex-1"
                      style={{ width: `${Math.max(newJobTitle.length, 10)}ch` }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateJobTitle(index)}
                      className="p-1 text-green-600 hover:text-harx-700 hover:bg-harx-50 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`group relative inline-flex items-center px-4 py-3 rounded-xl text-sm font-semibold border-2 cursor-pointer transition-all duration-200 ${selectedJobTitle === title
                      ? 'bg-gradient-harx text-white border-harx-500 shadow-lg transform scale-105'
                      : 'bg-gradient-to-r from-harx-50 to-harx-alt-50 text-harx-800 border-harx-200 hover:border-harx-300 hover:shadow-md hover:scale-102'
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedJobTitle(selectedJobTitle === title ? null : title);
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Disable double-click functionality
                    }}
                    title={selectedJobTitle === title ? "Selected as main job title" : "Click to select as main job title"}
                  >
                    {selectedJobTitle === title && (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    )}
                    {title}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(title, index);
                      }}
                      className={`ml-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${selectedJobTitle === title ? 'text-white hover:bg-white/20' : 'text-harx-600 hover:bg-harx-100'
                        }`}
                      title="Click to edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveJobTitle(title);
                        if (selectedJobTitle === title) {
                          setSelectedJobTitle(null);
                        }
                      }}
                      className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity ${selectedJobTitle === title
                        ? 'text-white hover:bg-harx-700'
                        : 'text-harx-600 hover:bg-harx-200 hover:text-harx-800'
                        }`}
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </span>
            ))}

            {/* Add button/input at the end */}
            {showJobTitleForm ? (
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-harx-100 border border-harx-300 rounded-full">
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddJobTitle();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={() => {
                    if (newJobTitle.trim()) {
                      handleAddJobTitle();
                    } else {
                      handleCancelEdit();
                    }
                  }}
                  placeholder="Enter job title..."
                  className="bg-transparent border-none outline-none text-sm font-medium text-harx-800 min-w-0 flex-1"
                  style={{ width: `${Math.max(newJobTitle.length || 15, 15)}ch` }}
                  autoFocus
                />
                <button
                  onClick={handleAddJobTitle}
                  disabled={!newJobTitle.trim()}
                  className="text-harx-600 hover:text-harx-800 disabled:opacity-50"
                  title="Add"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowJobTitleForm(true)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 font-medium text-sm rounded-full transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderHighlightsSection = () => {
    if (!suggestions) return null;

    const handleAddHighlight = () => {
      const value = newHighlight.trim();
      if (!value) return;

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.highlights) newSuggestions.highlights = [];
      if (!newSuggestions.highlights.includes(value)) {
        newSuggestions.highlights = [...newSuggestions.highlights, value];
        setSuggestions(newSuggestions);
        setNewHighlight('');
        setShowHighlightForm(false);
      }
    };

    const handleUpdateHighlight = (index: number) => {
      const value = newHighlight.trim();
      if (!value) return;

      const newSuggestions = { ...suggestions };
      if (newSuggestions.highlights) {
        newSuggestions.highlights[index] = value;
        setSuggestions(newSuggestions);
        setNewHighlight('');
        setEditingHighlightIndex(null);
      }
    };

    const handleRemoveHighlight = (highlight: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.highlights = newSuggestions.highlights.filter(h => h !== highlight);
      setSuggestions(newSuggestions);
    };

    const handleEditClick = (highlight: string, index: number) => {
      setNewHighlight(highlight);
      setEditingHighlightIndex(index);
      setShowHighlightForm(false);
    };

    const handleCancelEdit = () => {
      setNewHighlight('');
      setEditingHighlightIndex(null);
      setShowHighlightForm(false);
    };

    const selected = suggestions.highlights || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Key Highlights</h4>
        </div>


        {/* Highlights list */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {selected.map((highlight, index) => (
            <span key={index}>
              {editingHighlightIndex === index ? (
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-harx-100 border border-harx-200 rounded-full">
                  <input
                    type="text"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateHighlight(index);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    onBlur={() => {
                      if (newHighlight.trim()) {
                        handleUpdateHighlight(index);
                      } else {
                        handleCancelEdit();
                      }
                    }}
                    className="bg-transparent border-none outline-none text-sm font-medium text-harx-800 min-w-0 flex-1"
                    style={{ width: `${Math.max(newHighlight.length, 10)}ch` }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateHighlight(index)}
                    className="text-harx-600 hover:text-harx-800"
                    title="Save"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span
                  className="group relative inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-700 text-white border border-harx-600 hover:bg-harx-800 transition-colors"
                >
                  {highlight}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(highlight, index);
                    }}
                    className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-white"
                    title="Click to edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(highlight)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-harx-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </span>
          ))}

          {/* Add button/input at the end */}
          {showHighlightForm ? (
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-harx-100 border border-harx-200 rounded-full">
              <input
                type="text"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHighlight();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                onBlur={() => {
                  if (newHighlight.trim()) {
                    handleAddHighlight();
                  } else {
                    handleCancelEdit();
                  }
                }}
                placeholder="Enter highlight..."
                className="bg-transparent border-none outline-none text-sm font-medium text-harx-800 min-w-0 flex-1"
                style={{ width: `${Math.max(newHighlight.length || 15, 15)}ch` }}
                autoFocus
              />
              <button
                onClick={handleAddHighlight}
                disabled={!newHighlight.trim()}
                className="text-harx-600 hover:text-harx-800 disabled:opacity-50"
                title="Add"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHighlightForm(true)}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 font-medium text-sm rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDeliverablesSection = () => {
    if (!suggestions) return null;

    const handleAddDeliverable = () => {
      const value = newDeliverable.trim();
      if (!value) return;

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.deliverables) newSuggestions.deliverables = [];
      if (!newSuggestions.deliverables.includes(value)) {
        newSuggestions.deliverables = [...newSuggestions.deliverables, value];
        setSuggestions(newSuggestions);
        setNewDeliverable('');
        setShowDeliverableForm(false);
      }
    };

    const handleUpdateDeliverable = (index: number) => {
      const value = newDeliverable.trim();
      if (!value) return;

      const newSuggestions = { ...suggestions };
      if (newSuggestions.deliverables) {
        newSuggestions.deliverables[index] = value;
        setSuggestions(newSuggestions);
        setNewDeliverable('');
        setEditingDeliverableIndex(null);
      }
    };

    const handleRemoveDeliverable = (deliverable: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.deliverables = newSuggestions.deliverables.filter(d => d !== deliverable);
      setSuggestions(newSuggestions);
    };

    const handleEditClick = (deliverable: string, index: number) => {
      setNewDeliverable(deliverable);
      setEditingDeliverableIndex(index);
      setShowDeliverableForm(false);
    };

    const handleCancelEdit = () => {
      setNewDeliverable('');
      setEditingDeliverableIndex(null);
      setShowDeliverableForm(false);
    };

    const selected = suggestions.deliverables || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-harx-alt-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Deliverables</h4>
        </div>


        {/* Deliverables list */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {selected.map((deliverable, index) => (
            <span key={index}>
              {editingDeliverableIndex === index ? (
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-harx-alt-100 border border-harx-alt-200 rounded-full">
                  <input
                    type="text"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateDeliverable(index);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    onBlur={() => {
                      if (newDeliverable.trim()) {
                        handleUpdateDeliverable(index);
                      } else {
                        handleCancelEdit();
                      }
                    }}
                    className="bg-transparent border-none outline-none text-sm font-medium text-harx-alt-800 min-w-0 flex-1"
                    style={{ width: `${Math.max(newDeliverable.length, 10)}ch` }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateDeliverable(index)}
                    className="text-harx-alt-600 hover:text-harx-alt-800"
                    title="Save"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span
                  className="group relative inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-700 text-white border border-harx-600 hover:bg-harx-800 transition-colors"
                >
                  {deliverable}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(deliverable, index);
                    }}
                    className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-white"
                    title="Click to edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(deliverable)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-harx-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </span>
          ))}

          {/* Add button/input at the end */}
          {showDeliverableForm ? (
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-harx-alt-100 border border-harx-alt-200 rounded-full">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliverable();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                onBlur={() => {
                  if (newDeliverable.trim()) {
                    handleAddDeliverable();
                  } else {
                    handleCancelEdit();
                  }
                }}
                placeholder="Enter deliverable..."
                className="bg-transparent border-none outline-none text-sm font-medium text-harx-alt-800 min-w-0 flex-1"
                style={{ width: `${Math.max(newDeliverable.length || 15, 15)}ch` }}
                autoFocus
              />
              <button
                onClick={handleAddDeliverable}
                disabled={!newDeliverable.trim()}
                className="text-harx-alt-600 hover:text-harx-alt-800 disabled:opacity-50"
                title="Add"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeliverableForm(true)}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 font-medium text-sm rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSectorsSection = () => {
    if (!suggestions) return null;

    const handleAddSector = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.sectors) newSuggestions.sectors = [];
      if (!newSuggestions.sectors.includes(value)) {
        newSuggestions.sectors = [...newSuggestions.sectors, value];
        setSuggestions(newSuggestions);
      }
      // Reset select
      e.target.value = '';
    };

    const handleRemoveSector = (sector: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.sectors = newSuggestions.sectors.filter(s => s !== sector);
      setSuggestions(newSuggestions);
    };

    const selected = suggestions.sectors || [];
    const available = predefinedOptions.sectors.filter(sector => !selected.includes(sector));

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Sectors</h4>
        </div>

        {/* Add selector */}
        <select
          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
          defaultValue=""
          onChange={handleAddSector}
        >
          <option value="" disabled>Select a sector...</option>
          {available.map(sector => (
            <option key={sector} value={sector}>{sector}</option>
          ))}
        </select>

        {/* Available sectors */}
        {selected.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {selected.map(sector => (
                <span
                  key={sector}
                  className="group relative inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-700 text-white border border-harx-600 hover:bg-harx-800 transition-colors"
                >
                  {sector}
                  <button
                    type="button"
                    onClick={() => handleRemoveSector(sector)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-harx-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivitiesSection = () => {
    if (!suggestions) return null;

    const handleAddActivity = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;

      // Find the activity by label and get its ID
      const selectedActivity = activities.find(activity => activity.label === value);
      if (!selectedActivity) {
        console.error('❌ Activity not found:', value);
        return;
      }

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.activities) newSuggestions.activities = [];
      if (!newSuggestions.activities.includes(selectedActivity.value)) {
        newSuggestions.activities = [...newSuggestions.activities, selectedActivity.value];
        setSuggestions(newSuggestions);
      }
      // Reset select
      e.target.value = '';
    };

    const handleRemoveActivity = (activity: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.activities = newSuggestions.activities.filter(a => a !== activity);
      setSuggestions(newSuggestions);
    };

    const selected = suggestions.activities || [];
    const available = activities.filter(activity => !selected.includes(activity.value));

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Activities</h4>
        </div>

        {/* Add selector */}
        {activitiesLoading ? (
          <div className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 text-center text-sm">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Loading activities from API...
          </div>
        ) : (
          <select
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
            defaultValue=""
            onChange={handleAddActivity}
          >
            <option value="" disabled>Select an activity...</option>
            {available.map(activity => (
              <option key={activity.value} value={activity.label}>{activity.label}</option>
            ))}
          </select>
        )}

        {!activitiesLoading && activities.length === 0 && (
          <div className="text-center py-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            ⚠️ No activities available. Please check API connection.
          </div>
        )}

        {/* Available activities */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {selected.map(activityId => {
              const activityName = getActivityNameById(activityId);
              return activityName ? (
                <span
                  key={activityId}
                  className="group relative inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-700 text-white border border-harx-600 hover:bg-harx-800 transition-colors"
                >
                  {activityName}
                  <button
                    type="button"
                    onClick={() => handleRemoveActivity(activityId)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-harx-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  const renderIndustriesSection = () => {
    if (!suggestions) return null;

    const handleAddIndustry = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;

      // Find the industry by label and get its ID
      const selectedIndustry = industries.find(industry => industry.label === value);
      if (!selectedIndustry) {
        console.error('❌ Industry not found:', value);
        return;
      }

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.industries) newSuggestions.industries = [];
      if (!newSuggestions.industries.includes(selectedIndustry.value)) {
        newSuggestions.industries = [...newSuggestions.industries, selectedIndustry.value];
        setSuggestions(newSuggestions);
      }
      // Reset select
      e.target.value = '';
    };

    const handleRemoveIndustry = (industry: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.industries = newSuggestions.industries.filter(i => i !== industry);
      setSuggestions(newSuggestions);
    };

    const selected = suggestions.industries || [];
    const available = industries.filter(industry => !selected.includes(industry.value));

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-900">Industries</h4>
        </div>

        {/* Add selector */}
        {industriesLoading ? (
          <div className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 text-center text-sm">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Loading industries from API...
          </div>
        ) : (
          <select
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
            defaultValue=""
            onChange={handleAddIndustry}
          >
            <option value="" disabled>Select an industry...</option>
            {available.map(industry => (
              <option key={industry.value} value={industry.label}>{industry.label}</option>
            ))}
          </select>
        )}

        {!industriesLoading && industries.length === 0 && (
          <div className="text-center py-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            ⚠️ No industries available. Please check API connection.
          </div>
        )}

        {/* Selected badges - displayed below the select */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {selected.map(industryId => {
              const industryName = getIndustryNameById(industryId);
              return industryName ? (
                <span
                  key={industryId}
                  className="group relative inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-harx-700 text-white border border-harx-600 hover:bg-harx-800 transition-colors"
                >
                  {industryName}
                  <button
                    type="button"
                    onClick={() => handleRemoveIndustry(industryId)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-harx-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-harx-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFlexibilitySection = () => {
    if (!suggestions?.schedule) return null;

    const handleAddFlexibility = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.schedule.flexibility) newSuggestions.schedule.flexibility = [];
      if (!newSuggestions.schedule.flexibility.includes(value)) {
        newSuggestions.schedule.flexibility = [...newSuggestions.schedule.flexibility, value];
        setSuggestions(newSuggestions);
      }
      // Reset select
      e.target.value = '';
    };

    const handleRemoveFlexibility = (option: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.schedule.flexibility = newSuggestions.schedule.flexibility.filter(f => f !== option);
      setSuggestions(newSuggestions);
    };

    const selected = suggestions.schedule.flexibility || [];
    const available = FLEXIBILITY_SELECT_OPTIONS.filter(opt => !selected.includes(opt));

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Gauge className="w-5 h-5 text-harx-alt-500" />
          <h4 className="text-lg font-semibold text-gray-900">Schedule Flexibility</h4>
        </div>

        {/* Select pour ajouter */}
        <select
          className="w-full p-3 rounded-lg border border-purple-300 bg-white text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-harx-alt-400 mb-2"
          defaultValue=""
          onChange={handleAddFlexibility}
        >
          <option value="" disabled>Add flexibility option...</option>
          {available.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        {/* Badges sélectionnés - displayed below the select */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
            {selected.map(option => (
              <span key={option} className="group relative flex items-center bg-harx-alt-700 text-white text-sm font-medium pl-3 pr-2 py-1 rounded-full cursor-pointer hover:bg-purple-800 transition-colors">
                {option}
                <button
                  type="button"
                  onClick={() => handleRemoveFlexibility(option)}
                  className="ml-2 text-white hover:text-purple-200 rounded-full focus:outline-none focus:bg-harx-alt-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 italic text-center mt-2">
          Select all applicable schedule flexibility options
        </p>
      </div>
    );
  };


  const renderDescriptionSection = () => {
    if (!suggestions) return null;

    const handleDescriptionChange = (newDescription: string) => {
      const newSuggestions = { ...suggestions };
      newSuggestions.description = newDescription;
      setSuggestions(newSuggestions);
    };

    return (
      <div className="mb-8">
        <textarea
          value={suggestions.description || ""}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Enter a detailed description of the role, responsibilities, and what success looks like..."
          rows={8}
          className="w-full p-4 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500 resize-none text-gray-700 leading-relaxed"
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {suggestions.description ? `${suggestions.description.length} characters` : "0 characters"}
          </div>
          <div className="text-xs text-harx-600 bg-harx-100 px-2 py-1 rounded-full">
            Detailed description helps attract the right candidates
          </div>
        </div>
      </div>
    );
  };

  const renderCommissionSection = () => {
    if (!suggestions) return null;


    const updateCommissionOption = (
      _index: number,
      field: string,
      value: string | number
    ) => {
      const newSuggestions = { ...suggestions };
      if (newSuggestions.commission) {
        // Correction : parser uniquement les champs numériques
        const numericFields = [
          'amount', 'baseAmount', 'bonusAmount'
        ];
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          if (numericFields.includes(child)) {
            const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
            (newSuggestions.commission as any)[parent][child] = numericValue;
          } else {
            (newSuggestions.commission as any)[parent][child] = value;
          }
        } else {
          if (numericFields.includes(field)) {
            const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
            (newSuggestions.commission as any)[field] = numericValue;
          } else {
            (newSuggestions.commission as any)[field] = value;
          }
        }
        setSuggestions(newSuggestions);
      }
    };


    return (
      <div className="mb-8">
        {/* Commission Header */}
        {/* <div className="flex items-center mb-6 p-4 bg-gradient-to-r from-harx-50 to-emerald-50 rounded-xl border-2 border-harx-200 shadow-md">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-harx-500 to-emerald-600 rounded-xl shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-harx-700 to-emerald-700 bg-clip-text text-transparent">Commission Structure</h3>
              <p className="text-sm text-green-600 font-medium">Compensation details and performance incentives</p>
            </div>
          </div>
        </div> */}

        {suggestions.commission ? (
          <div className="rounded-3xl overflow-hidden">
            {(() => {
              const option = suggestions.commission;
              const index = 0;
              return (
                <div className="p-8">
                  {/* Header Section */}
                  {/* <div className="text-center mb-8 pb-6 border-b border-gray-200">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                      Commission Structure
                    </h2>
                    <p className="text-gray-500 text-sm">Configure compensation and performance incentives</p>
                  </div> */}

                  {/* Commission Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Currency Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-harx-100 hover:border-blue-200 group">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-harx-500 to-harx-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-bold text-gray-900">Currency</h3>
                          <p className="text-sm text-gray-500">Base currency for payments</p>
                        </div>
                      </div>

                      <div className="relative" ref={currencyDropdownRef}>
                        <button
                          type="button"
                          onClick={() => !currenciesLoading && setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                          disabled={currenciesLoading}
                          className="w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-50 border-2 border-blue-200 rounded-xl text-blue-900 font-semibold focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center overflow-hidden">
                            {(() => {
                              const currentVal = typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency;
                              const currency = currencies.find(c => c._id === currentVal || c.code === currentVal);
                              if (currency) {
                                return (
                                  <span className="truncate">
                                    {currency.name} ({currency.code}) {currency.symbol}
                                  </span>
                                );
                              }
                              return <span className="text-harx-400 font-normal">Select currency...</span>;
                            })()}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-harx-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCurrencyDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-harx-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Search currency..."
                                  value={currencySearchTerm}
                                  onChange={(e) => setCurrencySearchTerm(e.target.value)}
                                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-harx-400 focus:border-transparent"
                                />
                                {currencySearchTerm && (
                                  <button
                                    onClick={() => setCurrencySearchTerm("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                              {filteredCurrencies.length > 0 ? (
                                filteredCurrencies.map((currency) => (
                                  <button
                                    key={currency._id}
                                    type="button"
                                    onClick={() => {
                                      updateCommissionOption(
                                        0,
                                        "currency",
                                        { $oid: currency._id }
                                      );
                                      setIsCurrencyDropdownOpen(false);
                                      setCurrencySearchTerm("");
                                    }}
                                    className={`w-full px-4 py-3 text-left text-sm hover:bg-harx-50 transition-colors flex items-center justify-between group
                                    ${(typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency) === currency._id ? 'bg-harx-50 text-harx-700 font-bold' : 'text-gray-700'}
                                  `}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex flex-col">
                                        <span className="truncate">{currency.name}</span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{currency.code}</span>
                                      </div>
                                      <span className="font-bold text-harx-600 group-hover:scale-110 transition-transform ml-2">
                                        {currency.symbol}
                                      </span>
                                    </div>
                                    {(typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency) === currency._id && (
                                      <div className="w-2 h-2 rounded-full bg-harx-500 ml-2" />
                                    )}
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-8 text-center">
                                  <p className="text-gray-400 text-sm">No currencies found matching "{currencySearchTerm}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {currenciesLoading && (
                        <div className="flex items-center mt-3 text-sm text-harx-600">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading currencies...
                        </div>
                      )}
                    </div>

                    {/* Per call compensation Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-harx-100 hover:border-harx-200 group">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-harx-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-bold text-gray-900">Per call compensation</h3>
                          <p className="text-sm text-gray-500">Base amount per successful call</p>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={option.commission_per_call || option.baseAmount || ""}
                          onChange={(e) => {
                            updateCommissionOption(
                              0,
                              "commission_per_call",
                              e.target.value
                            );
                          }}
                          placeholder="2500"
                          className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-harx-50 to-emerald-50 border-2 border-harx-200 rounded-xl text-green-900 font-bold text-xl text-center focus:outline-none focus:ring-3 focus:ring-green-300 focus:border-green-400 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-600 text-lg font-bold">
                          {getCurrencySymbol((typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency) || getDefaultCurrencyId())}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Commission Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-harx-alt-100 hover:border-purple-200 group">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-harx-alt-500 to-harx-alt-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-bold text-gray-900">Transaction Commission</h3>
                          <p className="text-sm text-gray-500">Commission per transaction</p>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={typeof option.transactionCommission === 'object' ? (option.transactionCommission as any).amount : option.transactionCommission || ""}
                          onChange={(e) => {
                            updateCommissionOption(
                              0,
                              "transactionCommission",
                              e.target.value
                            );
                          }}
                          placeholder="25.50"
                          className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-harx-alt-50 to-violet-50 border-2 border-purple-200 rounded-xl text-purple-900 font-bold text-xl text-center focus:outline-none focus:ring-3 focus:ring-purple-300 focus:border-harx-alt-400 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-harx-alt-600 text-lg font-bold">
                          {getCurrencySymbol((typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency) || getDefaultCurrencyId())}
                        </span>
                      </div>
                    </div>

                    {/* Bonus & Incentives Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-yellow-100 hover:border-yellow-200 group">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-bold text-gray-900">Bonus & Incentives</h3>
                          <p className="text-sm text-gray-500">Performance bonus amount</p>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            typeof option.bonusAmount === "number"
                              ? option.bonusAmount
                              : option.bonusAmount
                                ? parseFloat(option.bonusAmount)
                                : ""
                          }
                          onChange={(e) =>
                            updateCommissionOption(
                              0,
                              "bonusAmount",
                              e.target.value
                            )
                          }
                          placeholder="500"
                          className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl text-yellow-900 font-bold text-xl text-center focus:outline-none focus:ring-3 focus:ring-yellow-300 focus:border-yellow-400 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-yellow-600 text-lg font-bold">
                          {getCurrencySymbol((typeof option.currency === 'object' ? (option.currency as any).$oid : option.currency) || getDefaultCurrencyId())}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Volume Requirements Section */}
                  <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-orange-100">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-harx-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                        <Gauge className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-bold text-gray-900">Minimum Volume Requirements</h3>
                        <p className="text-sm text-gray-500">Set minimum performance thresholds</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            typeof option.minimumVolume?.amount === "number"
                              ? option.minimumVolume.amount
                              : parseFloat(option.minimumVolume?.amount) || ""
                          }
                          onChange={(e) =>
                            updateCommissionOption(
                              0,
                              "minimumVolume.amount",
                              e.target.value
                            )
                          }
                          placeholder="100"
                          className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl text-orange-900 font-semibold text-center focus:outline-none focus:ring-3 focus:ring-orange-300 focus:border-harx-400 transition-all"
                        />
                      </div>

                      <select
                        value={option.minimumVolume?.period || ""}
                        onChange={(e) =>
                          updateCommissionOption(
                            0,
                            "minimumVolume.period",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl text-orange-900 font-semibold focus:outline-none focus:ring-3 focus:ring-orange-300 focus:border-harx-400 transition-all"
                      >
                        <option value="">Select Period</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {/* Additional Details Section */}
                  <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-bold text-gray-900">Additional Details</h3>
                        <p className="text-sm text-gray-500">Terms, conditions and special notes</p>
                      </div>
                    </div>

                    <textarea
                      value={option.additionalDetails || ""}
                      onChange={(e) =>
                        updateCommissionOption(
                          0,
                          "additionalDetails",
                          e.target.value
                        )
                      }
                      placeholder="Commission details, payment terms, conditions, or special notes..."
                      rows={4}
                      className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-3 focus:ring-gray-300 focus:border-gray-400 transition-all resize-none"
                    />
                  </div>

                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 shadow-lg">
            <div className="p-6 bg-gradient-to-br from-harx-100 to-emerald-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg">
              <DollarSign className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              No Commission Data
            </h3>
            <p className="text-gray-600 mb-8 w-full mx-auto text-lg leading-relaxed">
              Commission data will be populated automatically from AI suggestions.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSkillsSection = () => {
    if (!suggestions) return null;

    // Helper: get ObjectId for a skill name and type
    function getSkillObjectId(skillName: string, type: string): string | undefined {
      let arr: any[] = [];
      if (type === 'soft') arr = softSkills;
      if (type === 'professional') arr = professionalSkills;
      if (type === 'technical') arr = technicalSkills;
      const found = arr.find(s => s.name === skillName);
      return found?._id;
    }

    // Note: Skills migration is now handled at the top level of the component

    // Mapping for display: always show ObjectId if possible
    const skillsWithObjectIds: any = { ...suggestions.skills };
    ['soft', 'professional', 'technical'].forEach(type => {
      skillsWithObjectIds[type] = ((suggestions.skills as any)[type] as any[]).map(s => {
        if (typeof s.skill === 'string') {
          const oid = getSkillObjectId(s.skill, type);
          return { ...s, skill: oid ? { $oid: oid } : s.skill };
        }
        return s;
      });
    });

    const addSkill = (skillType: string, skill: string, level: number = 1, exactPosition?: number) => {

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.skills) {
        newSuggestions.skills = {
          languages: [],
          soft: [],
          professional: [],
          technical: [],
          certifications: [],
        };
      }

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
            newSuggestions.skills.languages.push(newLanguage);
          } else {
            console.warn(`Language with ID "${skill}" not found. Skipping addition.`);
            return; // Exit early without adding the skill
          }
          break;
        case "soft":
        case "professional":
        case "technical":
          // For skills, we need to find the skill object to get the ObjectId
          let skillArray: Array<{ _id: string, name: string, description: string, category: string }>;
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
            (newSuggestions.skills as any)[skillType].push(skillData);
          } else {
            // Don't add skills that don't exist in the database
            return; // Exit early without adding the skill
          }
          break;
      }

      setSuggestions(newSuggestions);
    };

    const updateSkill = (skillType: string, index: number, field: string, value: string | number, exactPosition?: number) => {

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.skills) return;

      switch (skillType) {
        case "languages":
          if (field === "language") {
            // Find the language by ID to get the code
            const selectedLanguage = languages.find(l => l.value === value);
            if (selectedLanguage) {
              newSuggestions.skills.languages[index].language = selectedLanguage.value; // Store ID
              newSuggestions.skills.languages[index].iso639_1 = selectedLanguage.code; // Update code
            } else {
              console.warn(`Language with ID "${value}" not found. Skipping update.`);
              return;
            }
          } else if (field === "proficiency") {
            newSuggestions.skills.languages[index].proficiency = value as string;
            // Stocker la position exacte si fournie
            if (exactPosition !== undefined) {
              (newSuggestions.skills.languages[index] as any).exactPosition = exactPosition;
            }
          }
          break;
        case "soft":
        case "professional":
        case "technical":
          if (field === "skill") {
            // For skills, we need to find the skill object to get the ObjectId
            let skillArray: Array<{ _id: string, name: string, description: string, category: string }>;
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
              (newSuggestions.skills as any)[skillType][index].skill = { $oid: skillObject._id }; // Store MongoDB ObjectId format
              (newSuggestions.skills as any)[skillType][index].details = skillObject.description || ''; // Update details field
            } else {
              // Don't update with skills that don't exist in the database
              return; // Exit early without updating the skill
            }
          } else if (field === "level") {
            (newSuggestions.skills as any)[skillType][index].level = value as number;
            // Stocker la position exacte si fournie
            if (exactPosition !== undefined) {
              ((newSuggestions.skills as any)[skillType][index] as any).exactPosition = exactPosition;
            }
          }
          break;
      }
      setSuggestions(newSuggestions);
    };

    const deleteSkill = (skillType: string, index: number) => {

      const arr = (suggestions.skills as any)[skillType];
      if (arr && arr[index]) {
        const skillEntry = arr[index];
        if (skillEntry && skillEntry.skill && skillEntry.skill.$oid) {
        } else {
        }
      }
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.skills) return;
      switch (skillType) {
        case "languages":
          newSuggestions.skills.languages.splice(index, 1);
          break;
        case "soft":
          newSuggestions.skills.soft.splice(index, 1);
          break;
        case "professional":
          newSuggestions.skills.professional.splice(index, 1);
          break;
        case "technical":
          newSuggestions.skills.technical.splice(index, 1);
          break;
      }
      setSuggestions(newSuggestions);
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

      // Fonction pour commencer l'édition d'une compétence existante
      const handleStartEditSkill = (index: number) => {
        setEditingSkill(prev => ({ ...prev, [skillType]: index }));

        // Pré-remplir le terme de recherche avec le nom actuel
        if (currentItems && currentItems[index]) {
          const item = currentItems[index];
          let skillName = '';

          if (skillType === 'languages') {
            const languageItem = item as any;
            const language = languages.find(l => l.value === languageItem.language);
            skillName = language?.label || '';
          } else {
            const skillItem = item as any;
            // Utiliser la liste complète selon le type de compétence
            let allSkills: any[] = [];
            if (skillType === 'professional') {
              allSkills = professionalSkills.map(s => ({ id: s._id, name: s.name }));
            } else if (skillType === 'technical') {
              allSkills = technicalSkills.map(s => ({ id: s._id, name: s.name }));
            } else if (skillType === 'soft') {
              allSkills = softSkills.map(s => ({ id: s._id, name: s.name }));
            }

            const skillId = typeof skillItem.skill === 'string'
              ? skillItem.skill
              : (skillItem.skill && typeof skillItem.skill === 'object' && skillItem.skill.$oid
                ? skillItem.skill.$oid
                : null);

            const skill = allSkills.find(s => s.id === skillId);
            skillName = skill?.name || '';
          }

          // Plus besoin de pré-remplir car on utilise un sélecteur
        }
      };

      // Fonction pour confirmer l'édition d'une compétence
      const handleConfirmEditSkill = (index: number, newSkillId: string) => {
        if (skillType === 'languages') {
          const currentLanguage = suggestions?.skills?.languages?.[index];
          if (currentLanguage) {
            const updatedLanguages = [...(suggestions?.skills?.languages || [])];
            updatedLanguages[index] = {
              ...currentLanguage,
              language: newSkillId
            };
            setSuggestions(prev => prev ? ({
              ...prev,
              skills: {
                ...prev.skills,
                languages: updatedLanguages
              }
            }) : null);
          }
        } else {
          const currentSkills = suggestions?.skills?.[skillType as keyof typeof suggestions.skills] as any[];
          if (currentSkills && currentSkills[index]) {
            const updatedSkills = [...currentSkills];
            updatedSkills[index] = {
              ...updatedSkills[index],
              skill: newSkillId
            };
            setSuggestions(prev => prev ? ({
              ...prev,
              skills: {
                ...prev.skills,
                [skillType]: updatedSkills
              }
            }) : null);
          }
        }

        // Reset editing state
        setEditingSkill(prev => ({ ...prev, [skillType]: null }));
      };

      // Fonction pour annuler l'édition
      const handleCancelEditSkill = () => {
        setEditingSkill(prev => ({ ...prev, [skillType]: null }));
      };


      const handleRemoveSkill = (index: number) => {
        deleteSkill(skillType, index);
      };

      const getLevelLabel = (level: number, type: string) => {
        if (type === "languages") {
          const labels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced', 'Mastery'];
          return labels[level] || 'Intermediate';
        } else {
          const labels = ['', 'Basic', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
          return labels[level] || 'Basic';
        }
      };

      // Helper function to get progressive colors for skill levels
      const getProgressiveColor = (levelIndex: number, isActive: boolean): string => {
        if (!isActive) {
          return 'bg-white border-gray-300 hover:border-gray-400';
        }

        // Couleurs progressives selon le type de compétence
        const colorSchemes = {
          languages: [
            'bg-blue-200 border-harx-300',    // A1 - Très clair
            'bg-harx-300 border-harx-400',    // A2 - Clair
            'bg-harx-400 border-harx-500',    // B1 - Moyen clair
            'bg-harx-500 border-harx-600',    // B2 - Moyen
            'bg-harx-600 border-harx-700',    // C1 - Foncé
            'bg-harx-700 border-blue-800'     // C2 - Très foncé
          ],
          professional: [
            'bg-harx-200 border-green-300',  // Niveau 1
            'bg-green-300 border-green-400',  // Niveau 2
            'bg-green-400 border-harx-500',  // Niveau 3
            'bg-harx-500 border-green-600',  // Niveau 4
            'bg-green-600 border-harx-700'   // Niveau 5
          ],
          technical: [
            'bg-purple-200 border-purple-300', // Niveau 1
            'bg-purple-300 border-harx-alt-400', // Niveau 2
            'bg-harx-alt-400 border-harx-alt-500', // Niveau 3
            'bg-harx-alt-500 border-harx-alt-600', // Niveau 4
            'bg-harx-alt-600 border-harx-alt-700'  // Niveau 5
          ],
          soft: [
            'bg-orange-200 border-orange-300', // Niveau 1
            'bg-orange-300 border-harx-400', // Niveau 2
            'bg-harx-400 border-harx-500', // Niveau 3
            'bg-harx-500 border-orange-600', // Niveau 4
            'bg-orange-600 border-orange-700'  // Niveau 5
          ]
        };

        const colors = colorSchemes[skillType as keyof typeof colorSchemes];
        return colors[levelIndex] || colors[colors.length - 1];
      };

      const getSkillOptions = (editingIndex?: number) => {
        switch (skillType) {
          case "languages":
            return languages
              .filter(lang => {
                // Si on édite un élément, inclure l'élément actuel
                if (editingIndex !== undefined && currentItems[editingIndex] && currentItems[editingIndex].language === lang.value) {
                  return true;
                }
                // Sinon, exclure les éléments déjà sélectionnés
                return !currentItems.some(item => item.language === lang.value);
              })
              .map(lang => ({ id: lang.value, name: lang.label }));
          case "professional":
            return professionalSkills
              .filter(skill => {
                // Si on édite un élément, inclure l'élément actuel
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
                // Sinon, exclure les éléments déjà sélectionnés
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
                // Si on édite un élément, inclure l'élément actuel
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
                // Sinon, exclure les éléments déjà sélectionnés
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
                // Si on édite un élément, inclure l'élément actuel
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
                // Sinon, exclure les éléments déjà sélectionnés
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

      // Get colors for each skill type
      const getColors = () => {
        switch (skillType) {
          case "languages":
            return {
              border: "border-blue-200",
              focus: "focus:ring-harx-alt-400 focus:border-harx-alt-400",
              bg: "bg-gradient-to-br from-harx-50 via-harx-50 to-indigo-100",
              text: "text-harx-900",
              hover: "hover:from-indigo-100 hover:to-harx-100 hover:shadow-lg hover:shadow-indigo-100",
              shadow: "shadow-md shadow-harx-50"
            };
          case "professional":
            return {
              border: "border-blue-200",
              focus: "focus:ring-emerald-400 focus:border-emerald-400",
              bg: "bg-gradient-to-br from-emerald-50 via-harx-50 to-emerald-100",
              text: "text-emerald-900",
              hover: "hover:from-emerald-100 hover:to-harx-100 hover:shadow-lg hover:shadow-emerald-100",
              shadow: "shadow-md shadow-emerald-50"
            };
          case "technical":
            return {
              border: "border-violet-200",
              focus: "focus:ring-violet-400 focus:border-violet-400",
              bg: "bg-gradient-to-br from-violet-50 via-harx-alt-50 to-violet-100",
              text: "text-violet-900",
              hover: "hover:from-violet-100 hover:to-harx-alt-100 hover:shadow-lg hover:shadow-violet-100",
              shadow: "shadow-md shadow-violet-50"
            };
          case "soft":
            return {
              border: "border-amber-200",
              focus: "focus:ring-amber-400 focus:border-amber-400",
              bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100",
              text: "text-amber-900",
              hover: "hover:from-amber-100 hover:to-orange-100 hover:shadow-lg hover:shadow-amber-100",
              shadow: "shadow-md shadow-amber-50"
            };
          default:
            return {
              border: "border-slate-200",
              focus: "focus:ring-slate-400 focus:border-slate-400",
              bg: "bg-gradient-to-br from-slate-50 to-gray-100",
              text: "text-slate-900",
              hover: "hover:from-slate-100 hover:to-gray-100 hover:shadow-lg hover:shadow-slate-100",
              shadow: "shadow-md shadow-slate-50"
            };
        }
      };

      const colors = getColors();

      return (
        <div className="space-y-4">
          {/* Header avec titre et bouton + */}
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
                className={`w-8 h-8 rounded-full ${skillType === 'professional' ? 'bg-harx-500 hover:bg-green-600' : skillType === 'technical' ? 'bg-harx-alt-500 hover:bg-harx-alt-600' : skillType === 'languages' ? 'bg-harx-500 hover:bg-harx-600' : 'bg-harx-500 hover:bg-orange-600'} text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center group`}
                title={`Add ${skillType === "languages" ? "language" : "skill"}`}
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          {/* Add interface */}
          {skillsLoading && (
            <div className={`w-full px-4 py-3 rounded-lg border ${colors.border} bg-gray-50 text-gray-500 text-center text-sm`}>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading {skillType} from API...
            </div>
          )}


          {!skillsLoading && !showAddSkillInterface[skillType] && currentItems.length === 0 && (
            // Message when no skills
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No {skillType === "languages" ? "languages" : "skills"} added yet.
                <br />
                Click the + button above to add your first {skillType === "languages" ? "language" : "skill"}.
              </p>
            </div>
          )}

          {/* Selected badges - displayed below the select */}
          {(currentItems.length > 0 || showAddSkillInterface[skillType]) && (
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentItems.map((item, index) => {
                  let skillName = '';
                  let levelDisplay = null;

                  if (skillType === "languages") {
                    skillName = getLanguageNameById(item.language);
                    levelDisplay = (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.proficiency?.includes("C")
                        ? "bg-harx-100 text-green-800"
                        : item.proficiency?.includes("B")
                          ? "bg-harx-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {LANGUAGE_LEVELS.find(l => l.value === item.proficiency)?.label || "B1"}
                      </span>
                    );
                  } else {
                    let skillArray: Array<{ _id: string, name: string, description: string, category: string }>;
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
                    const skillId = typeof item.skill === 'string' ? item.skill : (item.skill && typeof item.skill === 'object' && item.skill.$oid ? item.skill.$oid : null);
                    if (skillId) {
                      const skillObject = skillArray.find(s => s._id === skillId);
                      skillName = skillObject ? skillObject.name : '';
                    }

                    levelDisplay = (
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3 h-3 ${star <= (item.level || 1)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                              }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    );
                  }

                  if (!skillName) return null;


                  return (
                    <div key={index} className={`group relative ${colors.bg} ${colors.text} text-sm font-medium p-3 rounded-xl border ${colors.border} ${colors.shadow} ${colors.hover} transition-all duration-300 h-14 flex items-center transform hover:scale-[1.02]`}>
                      {/* 3 equal columns layout: Name - Progress bar - Level */}
                      <div className="grid grid-cols-3 gap-4 items-center w-full">
                        {/* Column 1: Skill name */}
                        <div className="flex items-center">
                          {editingSkill[skillType] === index ? (
                            // Edit mode: selector
                            <select
                              value={(() => {
                                const currentItem = currentItems[index] as any;
                                if (skillType === 'languages') {
                                  return currentItem?.language || '';
                                } else {
                                  const skillId = typeof currentItem?.skill === 'string'
                                    ? currentItem.skill
                                    : (currentItem?.skill && typeof currentItem.skill === 'object' && currentItem.skill.$oid
                                      ? currentItem.skill.$oid
                                      : '');
                                  return skillId;
                                }
                              })()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleConfirmEditSkill(index, e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  handleCancelEditSkill();
                                }
                              }}
                              className={`edit-select w-full px-1 py-0.5 text-xs border ${colors.border} rounded bg-white transition-all duration-200`}
                              autoFocus
                            >
                              <option value="">
                                {skillType === 'languages' ? 'Select a language...' :
                                  skillType === 'professional' ? 'Select a professional skill...' :
                                    skillType === 'technical' ? 'Select a technical skill...' :
                                      'Select a soft skill...'}
                              </option>
                              {editSkillOptions.map(option => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            // Normal mode: clickable name
                            <button
                              onClick={() => handleStartEditSkill(index)}
                              className="font-medium text-xs truncate text-left hover:underline cursor-pointer w-full"
                              title="Click to edit"
                            >
                              {skillName}
                            </button>
                          )}
                        </div>

                        {/* Column 2: Progress bar (100 segments) */}
                        <div className="flex items-center justify-center">
                          <div className="relative w-full max-w-xs">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${(() => {
                                    const hoveredLevel = hoveredExistingLevel[skillType][index];
                                    if (hoveredLevel !== null && hoveredLevel !== undefined) {
                                      return hoveredLevel;
                                    }

                                    // Utiliser la position exacte stockée ou calculer la position par défaut
                                    if (skillType === "languages") {
                                      // Vérifier si on a une position exacte stockée
                                      const exactPosition = item.exactPosition;
                                      if (exactPosition !== undefined) {
                                        return exactPosition;
                                      }
                                      // Sinon, utiliser la position par défaut basée sur le niveau
                                      const currentLevelIndex = LANGUAGE_LEVELS.findIndex(l => l.value === item.proficiency);
                                      return ((currentLevelIndex + 1) / 6) * 100;
                                    } else {
                                      // Vérifier si on a une position exacte stockée
                                      const exactPosition = item.exactPosition;
                                      if (exactPosition !== undefined) {
                                        return exactPosition;
                                      }
                                      // Sinon, utiliser la position par défaut basée sur le niveau
                                      const currentLevel = item.level || 1;
                                      return (currentLevel / 5) * 100;
                                    }
                                  })()}%`,
                                  background: (() => {
                                    const hoveredLevel = hoveredExistingLevel[skillType][index];
                                    let currentPercentage;

                                    if (hoveredLevel !== null && hoveredLevel !== undefined) {
                                      currentPercentage = hoveredLevel;
                                    } else {
                                      // Calculer le pourcentage actuel
                                      if (skillType === "languages") {
                                        const exactPosition = item.exactPosition;
                                        if (exactPosition !== undefined) {
                                          currentPercentage = exactPosition;
                                        } else {
                                          const currentLevelIndex = LANGUAGE_LEVELS.findIndex(l => l.value === item.proficiency);
                                          currentPercentage = ((currentLevelIndex + 1) / 6) * 100;
                                        }
                                      } else {
                                        const exactPosition = item.exactPosition;
                                        if (exactPosition !== undefined) {
                                          currentPercentage = exactPosition;
                                        } else {
                                          const currentLevel = item.level || 1;
                                          currentPercentage = (currentLevel / 5) * 100;
                                        }
                                      }
                                    }

                                    // Créer une couleur unie avec opacité par paliers croissants
                                    // Dégradés correspondant aux couleurs des sections
                                    if (skillType === 'professional') {
                                      // Dégradé vert clair vers vert foncé (pour correspondre à l'icône verte)
                                      return `linear-gradient(90deg, #dcfce7 0%, #bbf7d0 ${currentPercentage * 0.2}%, #86efac ${currentPercentage * 0.4}%, #22c55e ${currentPercentage * 0.6}%, #16a34a ${currentPercentage * 0.8}%, #15803d ${currentPercentage}%, #14532d 100%)`;
                                    } else if (skillType === 'technical') {
                                      // Dégradé violet clair vers violet foncé (pour correspondre à l'icône violette)
                                      return `linear-gradient(90deg, #ddd6fe 0%, #c4b5fd ${currentPercentage * 0.2}%, #a78bfa ${currentPercentage * 0.4}%, #8b5cf6 ${currentPercentage * 0.6}%, #7c3aed ${currentPercentage * 0.8}%, #6d28d9 ${currentPercentage}%, #4c1d95 100%)`;
                                    } else if (skillType === 'languages') {
                                      // Dégradé bleu clair vers bleu foncé (pour correspondre à l'icône bleue)
                                      return `linear-gradient(90deg, #dbeafe 0%, #bfdbfe ${currentPercentage * 0.2}%, #93c5fd ${currentPercentage * 0.4}%, #60a5fa ${currentPercentage * 0.6}%, #3b82f6 ${currentPercentage * 0.8}%, #2563eb ${currentPercentage}%, #1d4ed8 100%)`;
                                    } else {
                                      // Dégradé orange clair vers orange foncé (pour correspondre à l'icône orange)
                                      return `linear-gradient(90deg, #fed7aa 0%, #fdba74 ${currentPercentage * 0.2}%, #fb923c ${currentPercentage * 0.4}%, #f97316 ${currentPercentage * 0.6}%, #ea580c ${currentPercentage * 0.8}%, #dc2626 ${currentPercentage}%, #b91c1c 100%)`;
                                    }
                                  })()
                                }}
                              />
                            </div>
                            <div
                              className="absolute inset-0 h-2 cursor-pointer"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = (clickX / rect.width) * 100;

                                if (skillType === "languages") {
                                  // 6 zones égales : 0-16.67%, 16.67-33.33%, 33.33-50%, 50-66.67%, 66.67-83.33%, 83.33-100%
                                  let languageLevel = 'A1';
                                  if (percentage >= 83.33) languageLevel = 'C2';
                                  else if (percentage >= 66.67) languageLevel = 'C1';
                                  else if (percentage >= 50) languageLevel = 'B2';
                                  else if (percentage >= 33.33) languageLevel = 'B1';
                                  else if (percentage >= 16.67) languageLevel = 'A2';
                                  else languageLevel = 'A1';

                                  // Mettre à jour le niveau ET stocker la position exacte
                                  updateSkill(skillType, index, 'proficiency', languageLevel, percentage);
                                } else {
                                  // 5 zones égales : 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                                  let level = 1;
                                  if (percentage >= 80) level = 5;
                                  else if (percentage >= 60) level = 4;
                                  else if (percentage >= 40) level = 3;
                                  else if (percentage >= 20) level = 2;
                                  else level = 1;

                                  // Mettre à jour le niveau ET stocker la position exacte
                                  updateSkill(skillType, index, 'level', level, percentage);
                                }
                              }}
                              onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const percentage = (mouseX / rect.width) * 100;

                                setHoveredExistingLevel(prev => ({
                                  ...prev,
                                  [skillType]: { ...prev[skillType], [index]: Math.round(percentage) }
                                }));
                              }}
                              onMouseLeave={(e) => {
                                // Reset le hover seulement (pas de sauvegarde automatique)
                                setHoveredExistingLevel(prev => ({
                                  ...prev,
                                  [skillType]: { ...prev[skillType], [index]: null }
                                }));
                              }}
                            />
                          </div>
                        </div>

                        {/* Column 3: Level name + Delete button */}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${skillType === 'professional' ? 'text-harx-700' : skillType === 'technical' ? 'text-violet-700' : skillType === 'languages' ? 'text-harx-700' : 'text-amber-700'}`}>
                            {(() => {
                              const hoveredLevel = hoveredExistingLevel[skillType][index];

                              if (hoveredLevel !== null && hoveredLevel !== undefined) {
                                // Convertir le pourcentage en description du niveau
                                if (skillType === "languages") {
                                  // 6 zones : 0-16.67%, 16.67-33.33%, 33.33-50%, 50-66.67%, 66.67-83.33%, 83.33-100%
                                  let languageLevel;
                                  if (hoveredLevel >= 83.33) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'C2');
                                  else if (hoveredLevel >= 66.67) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'C1');
                                  else if (hoveredLevel >= 50) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'B2');
                                  else if (hoveredLevel >= 33.33) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'B1');
                                  else if (hoveredLevel >= 16.67) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'A2');
                                  else languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'A1');
                                  // Extraire seulement la description après le " - "
                                  const description = languageLevel?.label?.split(' - ')[1] || 'Beginner';
                                  return description;
                                } else {
                                  // 5 zones : 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                                  let level = 1;
                                  if (hoveredLevel >= 80) level = 5;
                                  else if (hoveredLevel >= 60) level = 4;
                                  else if (hoveredLevel >= 40) level = 3;
                                  else if (hoveredLevel >= 20) level = 2;
                                  else level = 1;
                                  return getLevelLabel(level, skillType);
                                }
                              }

                              if (skillType === "languages") {
                                const currentLevel = LANGUAGE_LEVELS.find(l => l.value === item.proficiency);
                                const description = currentLevel?.label?.split(' - ')[1] || 'Intermediate';
                                return description;
                              } else {
                                return getLevelLabel(item.level || 1, skillType);
                              }
                            })()}
                          </span>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(index)}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${skillType === 'professional' ? 'bg-emerald-100 hover:bg-emerald-200 text-harx-700' : skillType === 'technical' ? 'bg-violet-100 hover:bg-violet-200 text-violet-700' : skillType === 'languages' ? 'bg-indigo-100 hover:bg-indigo-200 text-harx-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'} focus:outline-none opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 ml-2 hover:scale-110`}
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Interface d'ajout intégrée dans la grille */}
                {!skillsLoading && showAddSkillInterface[skillType] && (
                  <div
                    ref={(el) => { addInterfaceRefs.current[skillType] = el; }}
                    className={`group relative ${colors.bg} ${colors.text} text-sm font-medium p-3 rounded-xl border ${colors.border} ${colors.shadow} ${colors.hover} transition-all duration-300 h-14 flex items-center transform hover:scale-[1.02]`}
                  >
                    {/* 3 equal columns layout: Selector - Progress bar - Level */}
                    <div className="grid grid-cols-3 gap-4 items-center w-full">
                      {/* Column 1: Selector */}
                      <div className="flex items-center">
                        <select
                          value={selectedSkillToAdd[skillType] || ''}
                          onChange={(e) => {
                            setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: e.target.value }));
                            // Sauvegarder automatiquement dès la sélection
                            if (e.target.value) {
                              // Utiliser le niveau par défaut et la position par défaut
                              const defaultLevel = selectedLevelToAdd[skillType];
                              const defaultPosition = selectedExactPosition[skillType];
                              addSkill(skillType, e.target.value, defaultLevel, defaultPosition);

                              // Reset states après ajout
                              setShowAddSkillInterface(prev => ({ ...prev, [skillType]: false }));
                              setSelectedSkillToAdd(prev => ({ ...prev, [skillType]: '' }));
                              setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: skillType === "languages" ? 2 : 1 }));
                              setSelectedExactPosition(prev => ({ ...prev, [skillType]: undefined }));
                            }
                          }}
                          className={`w-full px-1 py-0.5 text-xs border ${colors.border} rounded bg-white transition-all duration-200`}
                        >
                          <option value="">
                            {skillType === "languages" ? "Select a language..." :
                              skillType === "professional" ? "Select a professional skill..." :
                                skillType === "technical" ? "Select a technical skill..." :
                                  "Select a soft skill..."}
                          </option>
                          {skillOptions.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Column 2: Progress bar (100 segments) */}
                      <div className="flex items-center justify-center">
                        <div className="relative w-full max-w-xs">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(() => {
                                  if (hoveredLevel[skillType] !== null && hoveredLevel[skillType] !== undefined) {
                                    return hoveredLevel[skillType];
                                  }

                                  // Utiliser la position exacte stockée ou calculer la position par défaut
                                  const exactPosition = selectedExactPosition[skillType];
                                  if (exactPosition !== undefined) {
                                    return exactPosition;
                                  }

                                  if (skillType === "languages") {
                                    // 6 zones égales : chaque niveau = 16.67%
                                    return ((selectedLevelToAdd[skillType] + 1) / 6) * 100;
                                  } else {
                                    // 5 zones égales : chaque niveau = 20%
                                    return (selectedLevelToAdd[skillType] / 5) * 100;
                                  }
                                })()}%`,
                                background: (() => {
                                  let currentPercentage;

                                  if (hoveredLevel[skillType] !== null && hoveredLevel[skillType] !== undefined) {
                                    currentPercentage = hoveredLevel[skillType];
                                  } else {
                                    // Utiliser la position exacte stockée ou calculer la position par défaut
                                    const exactPosition = selectedExactPosition[skillType];
                                    if (exactPosition !== undefined) {
                                      currentPercentage = exactPosition;
                                    } else {
                                      if (skillType === "languages") {
                                        // 6 zones égales : chaque niveau = 16.67%
                                        currentPercentage = ((selectedLevelToAdd[skillType] + 1) / 6) * 100;
                                      } else {
                                        // 5 zones égales : chaque niveau = 20%
                                        currentPercentage = (selectedLevelToAdd[skillType] / 5) * 100;
                                      }
                                    }
                                  }

                                  // Dégradés correspondant aux couleurs des sections
                                  if (skillType === 'professional') {
                                    // Dégradé vert clair vers vert foncé (pour correspondre à l'icône verte)
                                    return `linear-gradient(90deg, #dcfce7 0%, #bbf7d0 ${currentPercentage * 0.2}%, #86efac ${currentPercentage * 0.4}%, #22c55e ${currentPercentage * 0.6}%, #16a34a ${currentPercentage * 0.8}%, #15803d ${currentPercentage}%, #14532d 100%)`;
                                  } else if (skillType === 'technical') {
                                    // Dégradé violet clair vers violet foncé (pour correspondre à l'icône violette)
                                    return `linear-gradient(90deg, #ddd6fe 0%, #c4b5fd ${currentPercentage * 0.2}%, #a78bfa ${currentPercentage * 0.4}%, #8b5cf6 ${currentPercentage * 0.6}%, #7c3aed ${currentPercentage * 0.8}%, #6d28d9 ${currentPercentage}%, #4c1d95 100%)`;
                                  } else if (skillType === 'languages') {
                                    // Dégradé bleu clair vers bleu foncé (pour correspondre à l'icône bleue)
                                    return `linear-gradient(90deg, #dbeafe 0%, #bfdbfe ${currentPercentage * 0.2}%, #93c5fd ${currentPercentage * 0.4}%, #60a5fa ${currentPercentage * 0.6}%, #3b82f6 ${currentPercentage * 0.8}%, #2563eb ${currentPercentage}%, #1d4ed8 100%)`;
                                  } else {
                                    // Dégradé orange clair vers orange foncé (pour correspondre à l'icône orange)
                                    return `linear-gradient(90deg, #fed7aa 0%, #fdba74 ${currentPercentage * 0.2}%, #fb923c ${currentPercentage * 0.4}%, #f97316 ${currentPercentage * 0.6}%, #ea580c ${currentPercentage * 0.8}%, #dc2626 ${currentPercentage}%, #b91c1c 100%)`;
                                  }
                                })()
                              }}
                            />
                          </div>
                          <div
                            className="absolute inset-0 h-2 cursor-pointer"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = (clickX / rect.width) * 100;

                              // Stocker la position exacte du clic
                              setSelectedExactPosition(prev => ({ ...prev, [skillType]: percentage }));

                              if (skillType === "languages") {
                                // 6 zones : 0-16.67%, 16.67-33.33%, 33.33-50%, 50-66.67%, 66.67-83.33%, 83.33-100%
                                let levelIndex = 0; // A1
                                if (percentage >= 83.33) levelIndex = 5; // C2
                                else if (percentage >= 66.67) levelIndex = 4; // C1
                                else if (percentage >= 50) levelIndex = 3; // B2
                                else if (percentage >= 33.33) levelIndex = 2; // B1
                                else if (percentage >= 16.67) levelIndex = 1; // A2
                                else levelIndex = 0; // A1

                                setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: levelIndex }));
                              } else {
                                // 5 zones : 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                                let level = 1;
                                if (percentage >= 80) level = 5;
                                else if (percentage >= 60) level = 4;
                                else if (percentage >= 40) level = 3;
                                else if (percentage >= 20) level = 2;
                                else level = 1;

                                setSelectedLevelToAdd(prev => ({ ...prev, [skillType]: level }));
                              }

                              // Note: La compétence est déjà ajoutée dès la sélection dans le dropdown
                            }}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const mouseX = e.clientX - rect.left;
                              const percentage = (mouseX / rect.width) * 100;

                              setHoveredLevel(prev => ({ ...prev, [skillType]: Math.round(percentage) }));
                            }}
                            onMouseLeave={(e) => {
                              // Reset le hover seulement (pas de sauvegarde automatique)
                              setHoveredLevel(prev => ({ ...prev, [skillType]: null }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Column 3: Level name */}
                      <div className="flex items-center">
                        <span className={`text-xs font-semibold ${skillType === 'professional' ? 'text-harx-700' : skillType === 'technical' ? 'text-violet-700' : skillType === 'languages' ? 'text-harx-700' : 'text-amber-700'}`}>
                          {(() => {
                            if (hoveredLevel[skillType] !== null && hoveredLevel[skillType] !== undefined) {
                              // Convertir le pourcentage en description du niveau
                              if (skillType === "languages") {
                                // 6 zones : 0-16.67%, 16.67-33.33%, 33.33-50%, 50-66.67%, 66.67-83.33%, 83.33-100%
                                let languageLevel;
                                if (hoveredLevel[skillType] >= 83.33) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'C2');
                                else if (hoveredLevel[skillType] >= 66.67) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'C1');
                                else if (hoveredLevel[skillType] >= 50) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'B2');
                                else if (hoveredLevel[skillType] >= 33.33) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'B1');
                                else if (hoveredLevel[skillType] >= 16.67) languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'A2');
                                else languageLevel = LANGUAGE_LEVELS.find(l => l.value === 'A1');
                                // Extraire seulement la description après le " - "
                                const description = languageLevel?.label?.split(' - ')[1] || 'Beginner';
                                return description;
                              } else {
                                // 5 zones : 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
                                let level = 1;
                                if (hoveredLevel[skillType] >= 80) level = 5;
                                else if (hoveredLevel[skillType] >= 60) level = 4;
                                else if (hoveredLevel[skillType] >= 40) level = 3;
                                else if (hoveredLevel[skillType] >= 20) level = 2;
                                else level = 1;
                                return getLevelLabel(level, skillType);
                              }
                            }

                            if (skillType === "languages") {
                              const currentLevel = LANGUAGE_LEVELS[selectedLevelToAdd[skillType]];
                              const description = currentLevel?.label?.split(' - ')[1] || 'Intermediate';
                              return description;
                            } else {
                              return getLevelLabel(selectedLevelToAdd[skillType] || 1, skillType);
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {!skillsLoading && skillOptions.length === 0 && currentItems.length === 0 && (
            <div className="text-center py-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              ⚠️ No {skillType} available. Please check API connection.
            </div>
          )}

        </div>
      );
    };

    return (
      <div className="space-y-8">
        {renderSkillCard(
          "languages",
          suggestions.skills?.languages || [],
          "Languages",
          <Globe2 className="w-5 h-5 text-harx-500" />
        )}
        {renderSkillCard(
          "professional",
          suggestions.skills?.professional || [],
          "Professional Skills",
          <Briefcase className="w-5 h-5 text-harx-alt-500" />
        )}
        {renderSkillCard(
          "technical",
          suggestions.skills?.technical || [],
          "Technical Skills",
          <Target className="w-5 h-5 text-harx-500" />
        )}
        {renderSkillCard(
          "soft",
          suggestions.skills?.soft || [],
          "Soft Skills",
          <Users className="w-5 h-5 text-harx-alt-500" />
        )}
      </div>
    );
  };

  const renderTeamSection = () => {
    if (!suggestions) return null;

    const addTeamRole = () => {
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.team) {
        newSuggestions.team = {
          size: 1,
          structure: [],
          territories: [],
          reporting: {
            to: "Project Manager",
            frequency: "Weekly",
          },
          collaboration: ["Daily standups", "Weekly reviews"],
        };
      }

      const newRole = {
        roleId: "Agent",
        count: 1,
        seniority: {
          level: "Mid-Level",
          yearsExperience: 3,
        },
      };

      newSuggestions.team.structure.push(newRole);
      newSuggestions.team.size = newSuggestions.team.structure.reduce((sum, role) => {
        const roleCount = typeof role === 'object' && role !== null ? role.count : 1;
        return sum + roleCount;
      }, 0);
      setSuggestions(newSuggestions);
    };

    const updateTeamRole = (index: number, field: string, value: string | number) => {
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.team) return;

      // Ensure the role exists and has proper structure
      if (!newSuggestions.team.structure[index]) {
        newSuggestions.team.structure[index] = {
          roleId: "Agent",
          count: 1,
          seniority: {
            level: "Mid-Level",
            yearsExperience: 3,
          },
        };
      } else {
        // Check if role is a string and convert it to proper object structure
        const currentRole = newSuggestions.team.structure[index];
        if (typeof currentRole === 'string') {
          newSuggestions.team.structure[index] = {
            roleId: currentRole,
            count: 1,
            seniority: {
              level: "Mid-Level",
              yearsExperience: 3,
            },
          };
        } else if (typeof currentRole === 'object' && currentRole !== null) {
          // Ensure role has required properties
          if (!currentRole.roleId) {
            newSuggestions.team.structure[index] = {
              ...currentRole,
              roleId: "Agent",
              count: currentRole.count || 1,
              seniority: currentRole.seniority || {
                level: "Mid-Level",
                yearsExperience: 3,
              },
            };
          } else if (!currentRole.seniority) {
            newSuggestions.team.structure[index] = {
              ...currentRole,
              seniority: {
                level: "Mid-Level",
                yearsExperience: 3,
              },
            };
          }
        } else {
          // If role is null, undefined, or invalid, replace with default structure
          newSuggestions.team.structure[index] = {
            roleId: "Agent",
            count: 1,
            seniority: {
              level: "Mid-Level",
              yearsExperience: 3,
            },
          };
        }
      }

      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (child === "yearsExperience") {
          (newSuggestions.team.structure[index] as any)[parent][child] = parseInt(value as string) || 0;
        } else {
          (newSuggestions.team.structure[index] as any)[parent][child] = value;
        }
      } else {
        if (field === "count") {
          newSuggestions.team.structure[index].count = parseInt(value as string) || 1;
        } else {
          newSuggestions.team.structure[index].roleId = value as string;
        }
      }

      // Recalculate total team size
      newSuggestions.team.size = newSuggestions.team.structure.reduce((sum, role) => {
        const roleCount = typeof role === 'object' && role !== null ? role.count : 1;
        return sum + roleCount;
      }, 0);
      setSuggestions(newSuggestions);
    };

    const deleteTeamRole = (index: number) => {
      const newSuggestions = { ...suggestions };
      if (!newSuggestions.team) return;

      newSuggestions.team.structure.splice(index, 1);
      newSuggestions.team.size = newSuggestions.team.structure.reduce((sum, role) => {
        const roleCount = typeof role === 'object' && role !== null ? role.count : 1;
        return sum + roleCount;
      }, 0);
      setSuggestions(newSuggestions);
    };

    const addTerritory = (territory: string) => {
      if (!suggestions || !territory) return;

      const newSuggestions = { ...suggestions };
      if (!newSuggestions.team) {
        newSuggestions.team = {
          size: 1,
          structure: [],
          territories: [],
          reporting: {
            to: "Project Manager",
            frequency: "Weekly",
          },
          collaboration: ["Daily standups", "Weekly reviews"],
        };
      }

      // Ensure territories array exists
      if (!newSuggestions.team.territories) {
        newSuggestions.team.territories = [];
      }

      // Only add if not already present
      if (!newSuggestions.team.territories.includes(territory)) {
        newSuggestions.team.territories.push(territory);
        setSuggestions(newSuggestions);
      }
    };

    const removeTerritory = (territoryToRemove: string) => {
      if (!suggestions) return;
      const newSuggestions = { ...suggestions };
      if (newSuggestions.team && newSuggestions.team.territories) {
        newSuggestions.team.territories = newSuggestions.team.territories.filter(
          (territory) => territory !== territoryToRemove
        );
        setSuggestions(newSuggestions);
      }
    };

    return (
      <div className="space-y-4">
        {/* Team Roles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-bold bg-gradient-to-r from-harx-600 via-harx-600 to-harx-alt-600 bg-clip-text text-transparent">Team Roles</h4>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-harx-600">Total:</span>
                <span className="text-md font-bold text-harx-700 bg-white border border-harx-300 rounded-md px-2 py-1">
                  {suggestions.team?.size || 0}
                </span>
              </div>
            </div>
            <button
              onClick={addTeamRole}
              className="flex items-center space-x-1 bg-gradient-harx hover:opacity-90 text-white font-bold px-3 py-1 rounded-md shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Role</span>
            </button>
          </div>

          {suggestions.team?.structure && suggestions.team.structure.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {suggestions.team.structure.map((role, index) => {
                // Handle case where role might be a string
                const roleId = typeof role === 'string' ? role : (role?.roleId || 'Agent');
                const roleCount = typeof role === 'object' && role !== null ? role.count : 1;
                const seniorityLevel = typeof role === 'object' && role !== null ? (role.seniority?.level || 'Mid-Level') : 'Mid-Level';
                const yearsExperience = typeof role === 'object' && role !== null ? (role.seniority?.yearsExperience || 3) : 3;

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-2 border border-harx-500/20 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] hover:border-harx-500/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-md font-bold bg-gradient-harx bg-clip-text text-transparent">Role #{index + 1}</h5>
                      <button
                        onClick={() => deleteTeamRole(index)}
                        className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all transform hover:scale-110 shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-bold text-harx-700 mb-1 block">
                          Role Type
                        </label>
                        <select
                          value={roleId}
                          onChange={(e) => updateTeamRole(index, "roleId", e.target.value)}
                          className="w-full p-2 border border-blue-200 rounded-md bg-harx-50 focus:outline-none focus:ring-1 focus:ring-harx-alt-500 focus:border-harx-alt-500 font-medium text-harx-700 transition-all text-sm"
                        >
                          {TEAM_ROLES.map((teamRole) => (
                            <option key={teamRole} value={teamRole}>
                              {teamRole}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-harx-500 mb-1 block">
                          Number of Members
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={roleCount}
                          onChange={(e) => updateTeamRole(index, "count", e.target.value)}
                          className="w-full p-2 border border-harx-500/20 rounded-md bg-harx-50 focus:outline-none focus:ring-1 focus:ring-harx-500 focus:border-harx-500 font-medium text-harx-500 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-harx-50 via-harx-50 to-violet-50 rounded-xl border-2 border-dashed border-harx-300">
              <div className="p-4 bg-gradient-to-br from-harx-500 via-harx-alt-500 to-harx-alt-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-harx-700 via-harx-700 to-violet-700 bg-clip-text text-transparent mb-2">
                No Team Roles Defined
              </h3>
              <p className="text-harx-600 font-medium mb-4 max-w-md mx-auto text-sm">
                Add team roles to define the structure and responsibilities of your team members.
              </p>
              <button
                onClick={addTeamRole}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-alt-500 hover:from-harx-600 hover:via-harx-600 hover:to-harx-alt-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team Role</span>
              </button>
            </div>
          )}
        </div>

        {/* Territories */}
        <div className="bg-gradient-to-br from-harx-50 via-harx-50 to-violet-50 rounded-lg p-3 border border-blue-200 shadow-md mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-md font-semibold text-gray-900">Territories</h4>
          </div>

          <select
            onChange={(e) => {
              if (e.target.value) {
                addTerritory(e.target.value);
                e.target.value = ""; // Reset select
              }
            }}
            className="w-full p-2 rounded-md border border-harx-300 bg-white text-harx-900 font-semibold focus:outline-none focus:ring-1 focus:ring-harx-alt-400 mb-1 text-sm"
            defaultValue=""
            disabled={territoriesLoading}
          >
            <option value="" disabled>
              {territoriesLoading ? "Loading territories..." : "Add territory..."}
            </option>
            {territoriesFromAPI.filter(
              (country: Country) => !suggestions.team?.territories?.includes(country._id)
            ).map((country: Country) => (
              <option key={country._id} value={country._id}>
                {country.name.common}
              </option>
            ))}
          </select>

          {/* Territories badges - displayed below the select */}
          {suggestions.team?.territories && suggestions.team.territories.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-blue-200">
              {suggestions.team.territories.map((territory) => (
                <span
                  key={territory}
                  className="group relative flex items-center bg-gradient-to-r from-harx-600 to-harx-600 text-white text-xs font-medium pl-2 pr-1 py-1 rounded-full cursor-pointer hover:from-harx-700 hover:to-harx-700 transition-colors"
                >
                  <span>{getTerritoryName(territory)}</span>
                  <button
                    onClick={() => removeTerritory(territory)}
                    className="ml-1 text-white hover:text-blue-200 rounded-full focus:outline-none focus:bg-harx-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 italic text-center mt-1">
            {territoriesLoading
              ? 'Loading countries from API...'
              : `${territoriesFromAPI.filter((country: Country) => !suggestions.team?.territories?.includes(country._id)).length} countries available for selection`
            }
          </p>
        </div>
      </div>
    );
  };

  if (loading && !props.initialSuggestions) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-8">
          {/* Mascot Logo - Enhanced Central focus */}
          <div className="transform scale-150 transition-all duration-1000">
            <Logo />
          </div>
          <p className="mt-8 text-2xl font-bold bg-gradient-harx bg-clip-text text-transparent animate-pulse tracking-widest drop-shadow-sm border-2 border-harx-200 px-6 py-2 rounded-full shadow-inner bg-white/50 backdrop-blur-md">generating...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-harx-50/30 to-harx-50/20 flex flex-col justify-center items-center">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="mb-8">
            <Logo className="mb-6" />
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Error Generating Suggestions
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {error}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={props.onBack}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Input
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-harx-50/30 to-harx-50/20 flex flex-col justify-center items-center">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="mb-8">
            <Logo className="mb-6" />
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
            <div className="flex items-center justify-center mb-4">
              <Logo className="scale-75" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                No Suggestions Available
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We couldn't generate suggestions based on your input. Please try again with different requirements.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={props.onBack}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-harx-600 border border-transparent rounded-lg hover:bg-harx-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-harx-500 shadow-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Input
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

          {/* Navigation Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <button
              onClick={props.onBack}
              className="group inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Input
            </button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Review & Refine Suggestions
              </h2>
              {/* Mock Data Indicator */}
              {import.meta.env.VITE_USE_MOCK_DATA === 'true' && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  🎭 Mock Mode Active
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="group inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-harx-500 hover:bg-harx-600 border border-transparent rounded-lg transition-colors shadow-sm"
            >
              Confirm & Continue
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8">
        <div className="space-y-8">

          {/* Basic Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-harx px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Basic Information</h3>
                  <p className="text-harx-100 text-sm">Core details and requirements for your gig</p>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-6">
              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                <div className="space-y-2">
                  {renderJobTitlesSection()}
                </div>
              </div>

              <div className="bg-harx-alt-50/50 rounded-lg p-3 border border-harx-alt-500/20 shadow-md">
                <div className="space-y-2">
                  {renderHighlightsSection()}
                </div>
              </div>

              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-harx-500 rounded-full"></div>
                    <h4 className="text-lg font-semibold text-gray-900">Job Description</h4>
                  </div>
                  {renderDescriptionSection()}
                </div>
              </div>

              <div className="bg-harx-alt-50/50 rounded-lg p-3 border border-harx-alt-500/20 shadow-md">
                <div className="space-y-2">
                  {renderSectorsSection()}
                </div>
              </div>

              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                <div>
                  {renderIndustriesSection()}
                </div>
              </div>

              <div className="bg-harx-alt-50/50 rounded-lg p-3 border border-harx-alt-500/20 shadow-md">
                <div>
                  {renderActivitiesSection()}
                </div>
              </div>

              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                <div className="space-y-2">
                  {renderDeliverablesSection()}
                </div>
              </div>

              {/* Destination Zones */}
              <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 rounded-lg p-3 border border-slate-200 shadow-md">
                <div>
                  {renderDestinationZonesSection()}
                </div>
              </div>


            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-harx px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule & Availability</h3>
                  <p className="text-harx-alt-100 text-sm">Working hours, timezones, and flexibility options</p>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-4">
              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                {renderEditableSchedules()}
              </div>

              <div className="bg-harx-alt-50/50 rounded-lg p-3 border border-harx-alt-500/20 shadow-md">
                {renderMinimumHoursSection()}
              </div>

              <div className="bg-harx-50/50 rounded-lg p-3 border border-harx-500/20 shadow-md">
                {renderTimezoneSection()}
              </div>

              <div className="bg-harx-alt-50/50 rounded-lg p-3 border border-harx-alt-500/20 shadow-md">
                {renderFlexibilitySection()}
              </div>
            </div>
          </div>

          {/* Commission Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-harx px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Commission Structure</h3>
                  <p className="text-harx-100 text-sm">Compensation details and performance incentives</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {renderCommissionSection()}
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-harx px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Skills & Qualifications</h3>
                  <p className="text-harx-alt-100 text-sm">Required technical, professional, and soft skills</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {renderSkillsSection()}
            </div>
          </div>

          {/* Team Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-harx px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Team Structure</h3>
                  <p className="text-harx-100 text-sm">Team composition, roles, and territories</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {renderTeamSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


