import React, { useEffect, useMemo, useState } from 'react';
import { InfoText } from './InfoText';
import { predefinedOptions } from '../lib/guidance';
import { getCountryNameById } from '../lib/api';
import {
  Briefcase,
  Globe2,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
} from "lucide-react";
import { GigData } from '../types';
import i18n from 'i18n-iso-countries';
import fr from 'i18n-iso-countries/langs/fr.json';
import en from 'i18n-iso-countries/langs/en.json';
import { countryToAlpha2, alpha2ToCountry } from '../lib/countryCodes';
import {
  loadActivities,
  loadIndustries,
  getActivityOptions,
  getIndustryOptions,
  getActivityNameById,
  getIndustryNameById
} from '../lib/activitiesIndustries';
import { fetchAllCountries, Country } from '../lib/api';

// Enregistrement des langues pour la traduction des noms de pays
i18n.registerLocale(fr);
i18n.registerLocale(en);

/**
 * Interface définissant les props du composant BasicSection
 * @property {GigData} data - Les données du gig
 * @property {Function} onChange - Callback pour mettre à jour les données
 * @property {Object} errors - Les erreurs de validation
 * @property {Function} onPrevious - Callback pour la navigation précédente
 * @property {Function} onNext - Callback pour la navigation suivante
 * @property {Function} onSave - Callback pour sauvegarder les données
 * @property {Function} onAIAssist - Callback pour l'assistance IA
 * @property {Function} onSectionChange - Callback pour changer de section
 * @property {string} currentSection - La section actuelle
 */
interface BasicSectionProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  onAIAssist?: () => void;
  onSectionChange?: (sectionId: string) => void;
  currentSection: string;
}

/**
 * Composant principal BasicSection
 * Gère l'affichage et la modification des informations de base d'un gig
 */
const BasicSection: React.FC<BasicSectionProps> = ({
  data,
  onChange,
  errors,
  onPrevious,
  onNext
}) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [activities, setActivities] = useState<Array<{ value: string; label: string; category: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ value: string; label: string }>>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryName, setCountryName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load activities and industries data from external API ONLY
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load data from external API with error handling
        const results = await Promise.all([
          loadActivities(),
          loadIndustries(),
          fetchAllCountries()
        ]);
        const countriesData = results[2] as Country[];

        const activityOptions = getActivityOptions();
        const industryOptions = getIndustryOptions();

        // Validate that we have data
        if (activityOptions.length === 0) {
          throw new Error('No activities available from external API');
        }
        if (industryOptions.length === 0) {
          throw new Error('No industries available from external API');
        }
        if (!countriesData || countriesData.length === 0) {
          throw new Error('No countries available from external API');
        }

        setActivities(activityOptions);
        setIndustries(industryOptions);
        setCountries(countriesData);
      } catch (error) {
        console.error('❌ Critical error loading data from API:', error);
        // Show user-friendly error message but don't block the UI
        console.error(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`);
        // Set empty arrays to allow the form to work even without external data
        setActivities([]);
        setIndustries([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!data.destinationZones) {
      onChange({
        ...data,
        destinationZones: []
      });
    }
    if (!data.industries) {
      onChange({
        ...data,
        industries: []
      });
    }
    if (!data.activities) {
      onChange({
        ...data,
        activities: []
      });
    }
  }, []);

  useEffect(() => {
    // Récupérer le nom du pays si destination_zone est un ObjectId MongoDB
    if (data.destination_zone && data.destination_zone.length === 24) {
      const fetchCountryName = async () => {
        try {
          const name = await getCountryNameById(data.destination_zone);
          setCountryName(name);
          
        } catch (error) {
          console.error('❌ BASIC SECTION - Error fetching country name:', error);
          setCountryName(data.destination_zone);
        }
      };
      fetchCountryName();
    } else {
      setCountryName('');
    }
  }, [data.destination_zone]);

  /**
   * Obtient le nom du pays à partir de l'ID de l'API ou du code alpha-2
   * @param {string} countryId - L'ID du pays de l'API ou le code alpha-2
   * @returns {string} - Le nom du pays
   */
  const getCountryName = (countryId: string): string => {
    // D'abord chercher par ID dans l'API
    const countryFromApi = countries.find(country => country._id === countryId);
    if (countryFromApi) {
      
      return countryFromApi.name.common;
    }

    

    // Sinon, essayer avec les méthodes existantes (pour la compatibilité)
    return i18n.getName(countryId, 'en') || alpha2ToCountry[countryId] || countryId;
  };

  /**
   * Gère la sélection d'un pays
   * @param {string} countryId - L'ID du pays sélectionné
   */
  const handleCountrySelect = (countryId: string) => {
    if (!countryId) {
      // Si aucun pays n'est sélectionné, on met à jour uniquement destination_zone
      onChange({
        ...data,
        destination_zone: ''
      });
      return;
    }

    const country = countries.find(c => c._id === countryId);

    if (!country) {
      console.error('Invalid country ID:', countryId);
      return;
    }

    

    // Mettre à jour destination_zone et s'assurer que le pays sélectionné est dans destinationZones
    const updatedDestinationZones = data.destinationZones || [];
    if (!updatedDestinationZones.includes(countryId)) {
      // Ajouter le nouveau pays au début de la liste
      updatedDestinationZones.unshift(countryId);
    }

    onChange({
      ...data,
      destination_zone: countryId,
      destinationZones: updatedDestinationZones
    });
  };


  /**
   * Effet pour initialiser destination_zone seulement si elle est vide
   * Basé sur la logique de Suggestions.tsx et api.ts
   * Gère aussi la compatibilité avec destinationZone (sans underscore)
   */
  useEffect(() => {
    // Gérer la compatibilité entre destination_zone et destinationZone
    const destinationZoneValue = (data as any).destinationZone || data.destination_zone;
    const destinationZonesArray = data.destinationZones || [];

    // Si destination_zone est vide mais destinationZone (sans underscore) existe
    if (!data.destination_zone && destinationZoneValue) {
      
      onChange({
        ...data,
        destination_zone: destinationZoneValue,
        destinationZones: destinationZonesArray.length > 0 ? destinationZonesArray : [destinationZoneValue]
      });
      return;
    }

    // Seulement initialiser si destination_zone est vide et destinationZones contient des données
    if (!data.destination_zone && destinationZonesArray.length > 0) {
      const firstDestination = destinationZonesArray[0];

      

      // Si c'est déjà un code de pays (2-3 caractères), l'utiliser directement
      if (firstDestination && firstDestination.length <= 3) {
        // Valider que c'est un code de pays valide
        const countryName = i18n.getName(firstDestination, 'en');
        if (countryName) {
          onChange({ ...data, destination_zone: firstDestination });
        }
      } else {
        // Si c'est un MongoDB ObjectId (24 caractères), l'utiliser directement
        if (firstDestination && firstDestination.length === 24) {
          onChange({ ...data, destination_zone: firstDestination });
        } else {
          // Convertir les noms de pays en codes
          const countryCode = countryToAlpha2[firstDestination] ||
            Object.entries(i18n.getNames('en'))
              .find(([_, name]) => name === firstDestination)?.[0];

          if (countryCode) {
            onChange({ ...data, destination_zone: countryCode });
          }
        }
      }
    } else if (data.destination_zone && destinationZonesArray.length === 0) {
      // Si destination_zone est défini mais destinationZones est vide, initialiser destinationZones
      
      onChange({
        ...data,
        destinationZones: [data.destination_zone]
      });
    }
  }, [data.destinationZones, data.destination_zone, (data as any).destinationZone]);

  /**
   * Effet pour ajouter les icônes Material Icons
   */
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  /**
   * Récupère toutes les catégories disponibles
   * Inclut les catégories prédéfinies et les nouvelles catégories
   */
  const allCategories = useMemo(() => {
    const categories = new Set(predefinedOptions.basic.categories);
    if (data.category && !categories.has(data.category)) {
      categories.add(data.category);
    }
    return Array.from(categories);
  }, [data.category]);

  /**
   * Gère les changements dans la section séniorité
   * @param {string} field - Le champ modifié (level, years, yearsExperience)
   * @param {string} value - La nouvelle valeur
   */

  // Log Basic Section data
  useEffect(() => {
  }, [data, errors]);

  // Le rendu du composant
  
  
  
  
  
  
  
  
  
  
  

  return (
    <div className="w-full bg-white py-6">


      <div className="space-y-8">
        <InfoText>
          Start by providing the basic information about the contact center role. Be specific and clear
          about the position's requirements and responsibilities.
        </InfoText>

        {/* --- Position Details --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-harx px-6 py-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Position Details</h3>
                <p className="text-white/80 text-sm">Define the role title and main responsibilities</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all ${errors.title ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'}`}
                placeholder="e.g., Senior Customer Service Representative"
              />
              {errors.title && <p className="mt-2 text-sm text-red-600 font-medium">{errors.title.join(', ')}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                rows={5}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all resize-none ${errors.description ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'}`}
                placeholder="Describe the role, key responsibilities, and what success looks like in this position. Be specific about daily tasks, required skills, and performance expectations..."
              />
              {errors.description && <p className="mt-2 text-sm text-red-600 font-medium">{errors.description.join(', ')}</p>}
            </div>
          </div>
        </div>

        {/* --- Role Category --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-harx px-6 py-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Role Category</h3>
                <p className="text-white/80 text-sm">Select the primary focus area</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Affichage de la catégorie sélectionnée */}
            {data.category && (
              <div className="mb-4 p-3 bg-harx-50 border border-harx-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-harx-500" />
                  <span className="text-sm font-medium text-harx-900">Selected Category:</span>
                  <span className="text-sm text-harx-700">{data.category}</span>
                  {!predefinedOptions.basic.categories.includes(data.category) && (
                    <span className="text-xs text-harx-500 bg-harx-100 px-2 py-1 rounded-full">Custom</span>
                  )}
                </div>
              </div>
            )}

            {/* Sélecteur de catégorie */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="flex items-center gap-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Target className="w-5 h-5 text-harx-400" />
                </span>
                <select
                  value={data.category || ''}
                  onChange={e => onChange({ ...data, category: e.target.value })}
                  className="block w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white text-gray-800 appearance-none transition-all"
                >
                  <option value="" disabled className="text-gray-400">Select a category</option>
                  {allCategories.map(category => (
                    <option key={category} value={category} className="text-gray-800">{category}</option>
                  ))}
                </select>
                {/* Badge Custom à côté du select si catégorie personnalisée */}
                {data.category && !predefinedOptions.basic.categories.includes(data.category) && (
                  <span className="text-xs text-harx-500 bg-harx-100 px-2 py-1 rounded-full ml-2">Custom</span>
                )}
              </div>
            </div>

            {/* Ancienne grille de boutons supprimée */}
            {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category.join(', ')}</p>}
          </div>

          {/* --- Industries --- */}
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-harx-alt-100 rounded-lg">
                <Target className="w-5 h-5 text-harx-alt-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Industries</h3>
                <p className="text-sm text-gray-500">Select relevant industries for this position</p>
              </div>
            </div>

            {/* Affichage des industries sélectionnées */}
            {(data.industries || []).length > 0 && (
              <div className="mb-4 p-3 bg-harx-alt-50 border border-harx-alt-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-harx-alt-600" />
                  <span className="text-sm font-medium text-harx-alt-900">Selected Industries:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.industries || []).map((industryId, index) => {
                    const industryName = getIndustryNameById(industryId);
                    return industryName ? (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-harx-alt-100 text-harx-alt-700 text-sm rounded-full">
                        {industryName}
                        <button
                          onClick={() => {
                            const currentIndustries = data.industries || [];
                            const updatedIndustries = currentIndustries.filter((_, i) => i !== index);
                            onChange({ ...data, industries: updatedIndustries });
                          }}
                          className="ml-1 text-harx-alt-500 hover:text-harx-alt-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Sélecteur d'industrie */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add Industry
                {isLoading && <span className="ml-2 text-xs text-gray-500">(Loading...)</span>}
                {!isLoading && <span className="ml-2 text-xs text-harx-500">({industries.length} available)</span>}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Target className="w-5 h-5 text-harx-alt-400" />
                  </span>
                  <select
                    value={selectedIndustry}
                    onChange={e => {
                      const value = e.target.value;
                      setSelectedIndustry(value);
                      if (value && value !== '') {
                        const currentIndustries = data.industries || [];
                        if (!currentIndustries.includes(value)) {
                          const updatedIndustries = [...currentIndustries, value];
                          onChange({ ...data, industries: updatedIndustries });
                          setSelectedIndustry(''); // Reset after adding
                        }
                      }
                    }}
                    className="block w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-harx-alt-500 focus:border-harx-alt-500 bg-white text-gray-800 appearance-none transition-all"
                  >
                    <option value="" className="text-gray-400">
                      {isLoading ? 'Loading industries...' : 'Select an industry'}
                    </option>
                    {!isLoading && industries
                      .filter(industry => !(data.industries || []).includes(industry.value))
                      .map(industry => (
                        <option key={industry.value} value={industry.value} className="text-gray-800">{industry.label}</option>
                      ))}
                  </select>
                </div>
                {(data.industries || []).length > 0 && (
                  <button
                    onClick={() => {
                      onChange({ ...data, industries: [] });
                      setSelectedIndustry('');
                    }}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {(data.industries || []).length === 0 && !isLoading && (
                <p className="mt-2 text-sm text-gray-500">No industries selected yet</p>
              )}
              {isLoading && (
                <p className="mt-2 text-sm text-harx-500">Loading industries from API...</p>
              )}
            </div>
            {errors.industries && <p className="mt-2 text-sm text-red-600">{errors.industries.join(', ')}</p>}
          </div>

          {/* --- Activities --- */}
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-harx-100 rounded-lg">
                <Target className="w-5 h-5 text-harx-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Activities</h3>
                <p className="text-sm text-gray-500">Select relevant activities for this position</p>
              </div>
            </div>

            {/* Affichage des activités sélectionnées */}
            {(data.activities || []).length > 0 && (
              <div className="mb-4 p-3 bg-harx-50 border border-harx-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-harx-600" />
                  <span className="text-sm font-medium text-harx-800">Selected Activities:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.activities || []).map((activityId, index) => {
                    const activityName = getActivityNameById(activityId);
                    return activityName ? (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-harx-100 text-harx-700 text-sm rounded-full">
                        {activityName}
                        <button
                          onClick={() => {
                            const currentActivities = data.activities || [];
                            const updatedActivities = currentActivities.filter((_, i) => i !== index);
                            onChange({ ...data, activities: updatedActivities });
                          }}
                          className="ml-1 text-harx-500 hover:text-harx-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Sélecteur d'activité */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add Activity
                {isLoading && <span className="ml-2 text-xs text-gray-500">(Loading...)</span>}
                {!isLoading && <span className="ml-2 text-xs text-harx-500">({activities.length} available)</span>}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Target className="w-5 h-5 bg-harx-400" />
                  </span>
                  <select
                    value={selectedActivity}
                    onChange={e => {
                      const value = e.target.value;
                      setSelectedActivity(value);
                      if (value && value !== '') {
                        const currentActivities = data.activities || [];
                        if (!currentActivities.includes(value)) {
                          const updatedActivities = [...currentActivities, value];
                          onChange({ ...data, activities: updatedActivities });
                          setSelectedActivity(''); // Reset after adding
                        }
                      }
                    }}
                    className="block w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white text-gray-800 appearance-none transition-all"
                  >
                    <option value="" className="text-gray-400">
                      {isLoading ? 'Loading activities...' : 'Select an activity'}
                    </option>
                    {!isLoading && activities
                      .filter(activity => !(data.activities || []).includes(activity.value))
                      .map(activity => (
                        <option key={activity.value} value={activity.value} className="text-gray-800">{activity.label}</option>
                      ))}
                  </select>
                </div>
                {(data.activities || []).length > 0 && (
                  <button
                    onClick={() => {
                      onChange({ ...data, activities: [] });
                      setSelectedActivity('');
                    }}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {(data.activities || []).length === 0 && !isLoading && (
                <p className="mt-2 text-sm text-gray-500">No activities selected yet</p>
              )}
              {isLoading && (
                <p className="mt-2 text-sm text-harx-500">Loading activities from API...</p>
              )}
            </div>
            {errors.activities && <p className="mt-2 text-sm text-red-600">{errors.activities.join(', ')}</p>}
          </div>

          {/* --- Destination Zone --- */}
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-harx-100 rounded-lg">
                <Globe2 className="w-5 h-5 text-harx-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Destination Zone</h3>
                <p className="text-sm text-gray-500">Select the target country</p>
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <div className="flex items-center gap-2 relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Globe2 className="w-5 h-5 text-harx-400" />
              </span>
              <select value={data.destination_zone || ''} onChange={(e) => handleCountrySelect(e.target.value)}
                className="mt-1 block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500 shadow-sm appearance-none transition-all">
                <option value="" disabled className="text-gray-400">Select a country</option>
                {countries.length > 0 ? (
                  countries
                    .sort((a, b) => a.name.common.localeCompare(b.name.common))
                    .map((country) => (
                      <option key={country._id} value={country._id} className="text-gray-800">
                        {country.name.common}
                      </option>
                    ))
                ) : (
                  <option disabled>Loading countries...</option>
                )}
              </select>
              <p className="text-xs text-gray-500 italic text-center mt-2">
                {countries.length > 0 ? `${countries.length} countries available for selection` : 'Loading countries...'}
              </p>
            </div>
            {data.destination_zone && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Globe2 className="w-4 h-4" />
                <span>Selected: {countryName || getCountryName(data.destination_zone)}</span>
                {data.destination_zone.length === 24 && !countryName && (
                  <span className="text-xs text-harx-500">(Loading country name...)</span>
                )}
              </div>
            )}
            {errors.destination_zone && <p className="mt-2 text-sm text-red-600">{errors.destination_zone.join(', ')}</p>}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={onPrevious} disabled={!onPrevious}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Previous
            </button>
          </div>
          <button onClick={onNext}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-harx-500 text-white hover:bg-harx-600 transition-colors">
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicSection;
