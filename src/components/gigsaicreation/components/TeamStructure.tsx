import React from 'react';
import { Plus, Trash2, Globe, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { predefinedOptions } from '../lib/guidance';
import { GigData } from '../types';
import { fetchAllCountries, Country } from '../lib/api';

interface TeamRoleOption {
  id: string;
  name: string;
  description: string;
}

// Type assertion pour predefinedOptions.team.roles
const teamRoles = predefinedOptions.team.roles as TeamRoleOption[];

interface TeamStructureProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: {
    team?: {
      size?: string;
      structure?: string[];
      territories?: string[];
      reporting?: {
        to?: string;
        frequency?: string;
      };
      collaboration?: string[];
    };
  };
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onAIAssist?: () => void;
  onSectionChange?: (sectionId: 'basic' | 'schedule' | 'commission' | 'leads' | 'skills' | 'team') => void;
  currentSection: 'basic' | 'schedule' | 'commission' | 'leads' | 'skills' | 'team';
}

// Function to get header gradient based on section type
const getHeaderGradient = (bgColor: string) => {
  switch (bgColor) {
    case 'blue':
      return 'from-harx-500 via-harx-600 to-harx-alt-500';
    case 'purple':
      return 'from-harx-alt-500 via-harx-alt-600 to-harx-500';
    case 'emerald':
      return 'from-harx-400 via-harx-500 to-harx-600';
    case 'orange':
      return 'from-harx-alt-400 via-harx-alt-500 to-harx-alt-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export function TeamStructure({ data, onChange, onPrevious, onNext }: TeamStructureProps) {
  // State for territories from API - now storing full country objects
  const [territoriesFromAPI, setTerritoriesFromAPI] = React.useState<Country[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = React.useState(true);
  const [territoryNames, setTerritoryNames] = React.useState<{ [key: string]: string }>({});

  // Fetch territories from API on component mount
  React.useEffect(() => {
    const fetchTerritories = async () => {
      try {
        const countries = await fetchAllCountries();
        setTerritoriesFromAPI(countries);

        // Create a mapping of country IDs to names for quick lookup
        const nameMapping: { [key: string]: string } = {};
        countries.forEach(country => {
          // If country.name is an object, try to use .common or .official, else fallback to string
          if (typeof country.name === 'string') {
            nameMapping[country._id] = country.name;
          } else if (country.name && typeof country.name === 'object') {
            nameMapping[country._id] = country.name.common || country.name.official || '';
          } else {
            nameMapping[country._id] = '';
          }
        });
        setTerritoryNames(nameMapping);

        setTerritoriesLoading(false);
      } catch (error) {
        console.error('Error fetching territories:', error);
        setTerritoriesLoading(false);
      }
    };

    fetchTerritories();
  }, []);

  // Helper functions from Suggestions.tsx logic
  const addTeamRole = () => {
    const newRole = {
      roleId: 'Agent',
      count: 1,
      seniority: {
        level: 'Mid-Level',
        yearsExperience: 3
      }
    };

    const updatedData = {
      ...data,
      team: {
        ...data.team,
        structure: [...(data.team?.structure || []), newRole]
      }
    };
    onChange(updatedData);
  };

  const updateTeamRole = (index: number, field: string, value: string | number) => {
    if (!data.team?.structure) return;

    const updatedStructure = [...data.team.structure];
    const role = updatedStructure[index];

    if (typeof role === 'object' && role !== null) {
      if (field === 'roleId') {
        role.roleId = value as string;
      } else if (field === 'count') {
        role.count = value as number;
      } else if (field === 'seniority.level') {
        if (!role.seniority) role.seniority = { level: 'Mid-Level', yearsExperience: 3 };
        role.seniority.level = value as string;
      } else if (field === 'seniority.yearsExperience') {
        if (!role.seniority) role.seniority = { level: 'Mid-Level', yearsExperience: 3 };
        role.seniority.yearsExperience = value as number;
      }
    }

    const updatedData = {
      ...data,
      team: {
        ...data.team,
        structure: updatedStructure
      }
    };
    onChange(updatedData);
  };

  const deleteTeamRole = (index: number) => {
    if (!data.team?.structure) return;

    const updatedStructure = data.team.structure.filter((_, i) => i !== index);
    const updatedData = {
      ...data,
      team: {
        ...data.team,
        structure: updatedStructure
      }
    };
    onChange(updatedData);
  };

  const addTerritory = (territory: string) => {
    const currentTerritories = data.team?.territories || [];
    if (currentTerritories.includes(territory)) return;

    const updatedData = {
      ...data,
      team: {
        ...data.team,
        territories: [...currentTerritories, territory]
      }
    };
    onChange(updatedData);
  };

  const removeTerritory = (territoryToRemove: string) => {
    const currentTerritories = data.team?.territories || [];
    const updatedTerritories = currentTerritories.filter(territory => territory !== territoryToRemove);

    const updatedData = {
      ...data,
      team: {
        ...data.team,
        territories: updatedTerritories
      }
    };
    onChange(updatedData);
  };

  const getTerritoryName = (territoryId: string): string => {
    // Handle case where territoryId might be a full country object
    if (typeof territoryId === 'object' && territoryId !== null) {
      const countryObj = territoryId as any;
      if (countryObj.name && typeof countryObj.name === 'object') {
        return countryObj.name.common || countryObj.name.official || 'Unknown Country';
      }
      return countryObj.name || 'Unknown Country';
    }

    // Handle case where territoryId is a string ID
    return territoryNames[territoryId] || territoryId;
  };

  return (
    <div className="w-full bg-white p-0">
      <div className="space-y-8">
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl shadow-sm border border-slate-100">

          {/* Team Structure Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('blue')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Team Structure</h3>
                  <p className="text-white/80 text-sm">Define team roles and member count</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Team Roles</span>
                  <span className="bg-harx-100 text-harx-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {data.team?.structure?.length || 0}
                  </span>
                </div>
                <button
                  onClick={addTeamRole}
                  className="flex items-center gap-2 px-3 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              </div>

              {data.team?.structure && data.team.structure.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.team.structure.map((role, index) => {
                    // Handle case where role might be a string
                    const roleId = typeof role === 'string' ? role : (role?.roleId || 'Agent');
                    const roleCount = typeof role === 'object' && role !== null ? role.count : 1;
                    const seniorityLevel = typeof role === 'object' && role !== null ? (role.seniority?.level || 'Mid-Level') : 'Mid-Level';
                    const yearsExperience = typeof role === 'object' && role !== null ? (role.seniority?.yearsExperience || 3) : 3;

                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl p-4 border-2 border-harx-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-bold text-harx-800">Role #{index + 1}</h5>
                          <button
                            onClick={() => deleteTeamRole(index)}
                            className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                            <select
                              value={roleId}
                              onChange={(e) => updateTeamRole(index, 'roleId', e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-white border border-harx-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                            >
                              {teamRoles.map((roleOption) => (
                                <option key={roleOption.id} value={roleOption.id}>
                                  {roleOption.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Count</label>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={roleCount}
                                onChange={(e) => updateTeamRole(index, 'count', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 text-sm bg-white border border-harx-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Experience</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={yearsExperience}
                                onChange={(e) => updateTeamRole(index, 'seniority.yearsExperience', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 text-sm bg-white border border-harx-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Seniority Level</label>
                            <select
                              value={seniorityLevel}
                              disabled
                              onChange={(e) => updateTeamRole(index, 'seniority.level', e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-gray-100 border border-harx-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500 cursor-not-allowed opacity-70"
                            >
                              <option value="Junior">Junior</option>
                              <option value="Mid-Level">Mid-Level</option>
                              <option value="Senior">Senior</option>
                              <option value="Lead">Lead</option>
                              <option value="Manager">Manager</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No team roles defined yet</p>
                  <p className="text-xs text-gray-400">Click "Add Role" to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Territories Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('emerald')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Territories</h3>
                  <p className="text-white/80 text-sm">Define operational territories and regions</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Territory</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addTerritory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={territoriesLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all disabled:opacity-50"
                >
                  <option value="">
                    {territoriesLoading ? 'Loading territories...' : 'Select a territory'}
                  </option>
                  {territoriesFromAPI
                    .filter(country => !(data.team?.territories || []).includes(country._id))
                    .map((country) => (
                      <option key={country._id} value={country._id}>
                        {country.name.common}
                      </option>
                    ))}
                </select>
              </div>

              {data.team?.territories && data.team.territories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.team.territories.map((territory, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-harx-50 to-harx-alt-50 border-2 border-harx-100 rounded-xl p-3 flex items-center justify-between group hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-sm font-medium text-harx-800 truncate">
                        {getTerritoryName(territory)}
                      </span>
                      <button
                        onClick={() => removeTerritory(territory)}
                        className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No territories selected</p>
                  <p className="text-xs text-gray-400">Select territories from the dropdown above</p>
                </div>
              )}
            </div>
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
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-harx-500 text-white hover:bg-harx-600 shadow-md hover:shadow-lg transition-all font-medium"
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
