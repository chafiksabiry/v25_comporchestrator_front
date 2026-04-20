import { fetchActivities, fetchIndustries, fetchLanguages, fetchSoftSkills, fetchTechnicalSkills, fetchProfessionalSkills } from './api';
import type { Activity, Industry, Language } from '../types';

let activitiesCache: Activity[] = [];
let industriesCache: Industry[] = [];
let languagesCache: Language[] = [];
let softSkillsCache: Array<{ _id: string, name: string, description: string, category: string }> = [];
let technicalSkillsCache: Array<{ _id: string, name: string, description: string, category: string }> = [];
let professionalSkillsCache: Array<{ _id: string, name: string, description: string, category: string }> = [];
let isActivitiesLoaded = false;
let isIndustriesLoaded = false;
let isLanguagesLoaded = false;
let isSoftSkillsLoaded = false;
let isTechnicalSkillsLoaded = false;
let isProfessionalSkillsLoaded = false;

export async function loadActivities(): Promise<Activity[]> {
  if (isActivitiesLoaded && activitiesCache.length > 0) {
    return activitiesCache;
  }
  try {
    const { data, error } = await fetchActivities();
    if (error) {
      console.error('❌ Error loading activities:', error);
      return [];
    }
    activitiesCache = data || [];
    isActivitiesLoaded = true;
    return activitiesCache;
  } catch (error) {
    console.error('❌ Error loading activities:', error);
    return [];
  }
}

export async function loadIndustries(): Promise<Industry[]> {
  if (isIndustriesLoaded && industriesCache.length > 0) {
    return industriesCache;
  }
  try {
    const { data, error } = await fetchIndustries();
    if (error) {
      console.error('❌ Error loading industries:', error);
      return [];
    }
    industriesCache = data || [];
    isIndustriesLoaded = true;
    return industriesCache;
  } catch (error) {
    console.error('❌ Error loading industries:', error);
    return [];
  }
}

export async function loadLanguages(): Promise<Language[]> {
  if (isLanguagesLoaded && languagesCache.length > 0) {
    return languagesCache;
  }
  try {
    const { data, error } = await fetchLanguages();
    if (error) {
      console.error('❌ Error loading languages:', error);
      return [];
    }
    languagesCache = data || [];
    isLanguagesLoaded = true;
    return languagesCache;
  } catch (error) {
    console.error('❌ Error loading languages:', error);
    return [];
  }
}

// Activity utility functions
export function getActivityById(id: string): Activity | undefined {
  return activitiesCache.find(activity => activity._id === id);
}

export function getActivityNameById(id: string): string {
  const activity = activitiesCache.find(activity => activity._id === id);
  return activity ? activity.name : '';
}

export function convertActivityNamesToIds(names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const activity = activitiesCache.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (activity) {
      ids.push(activity._id);
    } else {
      console.warn(`Activity "${name}" not found in cache`);
    }
  }
  return ids;
}

export function getActivityOptions(): Array<{ value: string; label: string; category: string }> {
  const options = activitiesCache
    .filter(activity => activity.isActive)
    .map(activity => ({
      value: activity._id,
      label: activity.name,
      category: activity.category
    }));
  return options;
}

// Industry utility functions
export function getIndustryById(id: string): Industry | undefined {
  return industriesCache.find(industry => industry._id === id);
}

export function getIndustryNameById(id: string): string {
  const industry = industriesCache.find(industry => industry._id === id);
  return industry ? industry.name : '';
}

export function convertIndustryNamesToIds(names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const industry = industriesCache.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (industry) {
      ids.push(industry._id);
    } else {
      console.warn(`Industry "${name}" not found in cache`);
    }
  }
  return ids;
}

export function getIndustryOptions(): Array<{ value: string; label: string }> {
  const options = industriesCache
    .filter(industry => industry.isActive)
    .map(industry => ({
      value: industry._id,
      label: industry.name
    }));
  return options;
}

// Language utility functions
export function getLanguageById(id: string): Language | undefined {
  return languagesCache.find(language => language._id === id);
}

export function getLanguageNameById(id: string): string {
  const language = languagesCache.find(language => language._id === id);
  if (!language) return '';

  // Handle case where name might be an object with common/official properties
  if (typeof language.name === 'object' && language.name !== null) {
    // If name is an object, try to get the common name first, then official, then fallback to nativeName
    return (language.name as any).common || (language.name as any).official || language.nativeName || 'Unknown Language';
  }

  return language.name;
}

export function getLanguageCodeById(id: string): string {
  const language = languagesCache.find(language => language._id === id);
  return language ? language.code : '';
}

export function convertLanguageNamesToIds(names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const language = languagesCache.find(l => {
      const langName = typeof l.name === 'string' ? l.name : (l.name as any).common || '';
      return langName.toLowerCase() === name.toLowerCase();
    });
    if (language) {
      ids.push(language._id);
    } else {
      console.warn(`Language "${name}" not found in cache`);
    }
  }
  return ids;
}

export function getLanguageOptions(): Array<{ value: string; label: string; code: string }> {
  const options = languagesCache.map(language => {
    // Handle case where name might be an object with common/official properties
    const languageName = typeof language.name === 'string'
      ? language.name
      : (language.name as any).common || (language.name as any).official || language.nativeName || 'Unknown Language';

    return {
      value: language._id,
      label: languageName,
      code: language.code
    };
  });
  return options;
}

// Load soft skills from API
export async function loadSoftSkills(): Promise<Array<{ _id: string, name: string, description: string, category: string }>> {
  if (isSoftSkillsLoaded && softSkillsCache.length > 0) {
    return softSkillsCache;
  }
  try {
    const response = await fetchSoftSkills();
    if (response.error) {
      console.error('❌ Error loading soft skills:', response.error);
      return [];
    }
    softSkillsCache = response.data;
    isSoftSkillsLoaded = true;
    return response.data;
  } catch (error) {
    console.error('❌ Error loading soft skills:', error);
    return [];
  }
}

// Load technical skills from API
export async function loadTechnicalSkills(): Promise<Array<{ _id: string, name: string, description: string, category: string }>> {
  if (isTechnicalSkillsLoaded && technicalSkillsCache.length > 0) {
    return technicalSkillsCache;
  }
  try {
    const response = await fetchTechnicalSkills();
    if (response.error) {
      console.error('❌ Error loading technical skills:', response.error);
      return [];
    }
    technicalSkillsCache = response.data;
    isTechnicalSkillsLoaded = true;
    return response.data;
  } catch (error) {
    console.error('❌ Error loading technical skills:', error);
    return [];
  }
}

// Load professional skills from API
export async function loadProfessionalSkills(): Promise<Array<{ _id: string, name: string, description: string, category: string }>> {
  if (isProfessionalSkillsLoaded && professionalSkillsCache.length > 0) {
    return professionalSkillsCache;
  }
  try {
    const response = await fetchProfessionalSkills();
    if (response.error) {
      console.error('❌ Error loading professional skills:', response.error);
      return [];
    }

    // Update global cache
    professionalSkillsCache = response.data;
    isProfessionalSkillsLoaded = true;



    return response.data;
  } catch (error) {
    console.error('❌ Error loading professional skills:', error);
    return [];
  }
}

// Get soft skill by ID
export function getSoftSkillById(id: string): { _id: string, name: string, description: string, category: string } | undefined {
  return softSkillsCache.find(skill => skill._id === id);
}

// Get technical skill by ID
export function getTechnicalSkillById(id: string): { _id: string, name: string, description: string, category: string } | undefined {
  return technicalSkillsCache.find(skill => skill._id === id);
}

// Get professional skill by ID
export function getProfessionalSkillById(id: string): { _id: string, name: string, description: string, category: string } | undefined {
  return professionalSkillsCache.find(skill => skill._id === id);
}

// Get soft skill name by ID
export function getSoftSkillNameById(id: string): string {
  const skill = softSkillsCache.find(skill => skill._id === id);
  return skill ? skill.name : 'Unknown Soft Skill';
}

// Get technical skill name by ID
export function getTechnicalSkillNameById(id: string): string {
  const skill = technicalSkillsCache.find(skill => skill._id === id);
  return skill ? skill.name : 'Unknown Technical Skill';
}

// Get professional skill name by ID
export function getProfessionalSkillNameById(id: string): string {
  const skill = professionalSkillsCache.find(skill => skill._id === id);
  return skill ? skill.name : 'Unknown Professional Skill';
}

// Convert soft skill names to IDs
export function convertSoftSkillNamesToIds(names: string[]): string[] {
  return names.map(name => {
    const skill = softSkillsCache.find(s => s.name.toLowerCase() === name.toLowerCase());
    return skill ? skill._id : name; // Return original name if not found
  });
}

// Convert technical skill names to IDs
export function convertTechnicalSkillNamesToIds(names: string[]): string[] {
  return names.map(name => {
    const skill = technicalSkillsCache.find(s => s.name.toLowerCase() === name.toLowerCase());
    return skill ? skill._id : name; // Return original name if not found
  });
}

// Convert professional skill names to IDs
export function convertProfessionalSkillNamesToIds(names: string[]): string[] {
  return names.map(name => {
    const skill = professionalSkillsCache.find(s => s.name.toLowerCase() === name.toLowerCase());
    return skill ? skill._id : name; // Return original name if not found
  });
}

// Get soft skill options for UI
export function getSoftSkillOptions(): Array<{ value: string; label: string; category: string }> {
  const options = softSkillsCache
    .map(skill => ({
      value: skill._id,
      label: skill.name,
      category: skill.category
    }));
  return options;
}

// Get technical skill options for UI
export function getTechnicalSkillOptions(): Array<{ value: string; label: string; category: string }> {
  const options = technicalSkillsCache
    .map(skill => ({
      value: skill._id,
      label: skill.name,
      category: skill.category
    }));
  return options;
}

// Get professional skill options for UI
export function getProfessionalSkillOptions(): Array<{ value: string; label: string; category: string }> {
  const options = professionalSkillsCache
    .map(skill => ({
      value: skill._id,
      label: skill.name,
      category: skill.category
    }));
  return options;
}

// Cache management
export function clearCache() {
  activitiesCache = [];
  industriesCache = [];
  languagesCache = [];
  softSkillsCache = [];
  technicalSkillsCache = [];
  professionalSkillsCache = [];
  isActivitiesLoaded = false;
  isIndustriesLoaded = false;
  isLanguagesLoaded = false;
  isSoftSkillsLoaded = false;
  isTechnicalSkillsLoaded = false;
  isProfessionalSkillsLoaded = false;
}

export async function initializeData() {
  await Promise.all([
    loadActivities(),
    loadIndustries(),
    loadLanguages(),
    loadSoftSkills(),
    loadTechnicalSkills(),
    loadProfessionalSkills()
  ]);

} 
