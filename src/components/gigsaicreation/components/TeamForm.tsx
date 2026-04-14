import React, { useState } from 'react';
import { PlusCircle, X, Save } from 'lucide-react';
import { predefinedOptions } from '../lib/guidance';

interface TeamRole {
  roleId: string;
  count: number;
  seniority: {
    level: string;
    yearsExperience: number;
  };
}

interface TeamData {
  size: number;
  structure: TeamRole[];
  territories: string[];
}

interface TeamFormProps {
  onSave: (data: TeamData) => void;
  predefinedRoles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  predefinedTerritories: string[];
}

const TeamForm: React.FC<TeamFormProps> = ({
  onSave,
  predefinedRoles,
  predefinedTerritories
}) => {
  const [teamData, setTeamData] = useState<TeamData>({
    size: 0,
    structure: [],
    territories: []
  });

  const handleAddRole = () => {
    setTeamData(prev => ({
      ...prev,
      structure: [
        ...prev.structure,
        {
          roleId: '',
          count: 1,
          seniority: {
            level: 'Mid Level',
            yearsExperience: 0
          }
        }
      ]
    }));
  };

  const handleRemoveRole = (index: number) => {
    setTeamData(prev => ({
      ...prev,
      structure: prev.structure.filter((_, i) => i !== index)
    }));
  };

  const handleRoleChange = (index: number, field: keyof TeamRole | 'seniority', value: any) => {
    const newData = { ...teamData };
    const role = { ...newData.structure[index] };

    if (field === 'seniority') {
      if (!predefinedOptions.basic.seniorityLevels.includes(value.level)) {
        return;
      }
      role.seniority = value;
    } else {
      (role as any)[field] = value;
    }

    newData.structure[index] = role;
    setTeamData(newData);
  };

  const handleTerritoriesChange = (territory: string) => {
    setTeamData(prev => ({
      ...prev,
      territories: prev.territories.includes(territory)
        ? prev.territories.filter(t => t !== territory)
        : [...prev.territories, territory]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(teamData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Size
        </label>
        <select
          value={teamData.size}
          onChange={(e) => setTeamData(prev => ({ ...prev, size: Number(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-harx-500 focus:border-harx-500"
          required
        >
          <option value="">Select team size...</option>
          <option value="1-5">1-5 members</option>
          <option value="6-10">6-10 members</option>
          <option value="11-20">11-20 members</option>
          <option value="21-50">21-50 members</option>
          <option value="50+">50+ members</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Structure
        </label>
        <div className="space-y-4">
          {teamData.structure.map((role, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 space-y-4">
                  <select
                    value={role.roleId}
                    onChange={(e) => handleRoleChange(index, 'roleId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-harx-500 focus:border-harx-500"
                    required
                  >
                    <option value="">Select role...</option>
                    {predefinedRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>

                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={role.count}
                        onChange={(e) => handleRoleChange(index, 'count', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-harx-500 focus:border-harx-500"
                        required
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seniority Level
                      </label>
                      <select
                        value={role.seniority.level}
                        onChange={(e) => handleRoleChange(index, 'seniority', {
                          ...role.seniority,
                          level: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-harx-500 focus:border-harx-500"
                        required
                      >
                        <option value="">Select seniority level</option>
                        {predefinedOptions.basic.seniorityLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(index)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddRole}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Role
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Territories
        </label>
        <div className="grid grid-cols-2 gap-2">
          {predefinedTerritories.map(territory => (
            <label key={territory} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={teamData.territories.includes(territory)}
                onChange={() => handleTerritoriesChange(territory)}
                className="rounded border-gray-300 text-harx-600 focus:ring-harx-500"
              />
              <span className="text-sm text-gray-700">{territory}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-harx-500 hover:bg-harx-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-harx-500"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Team Structure
        </button>
      </div>
    </form>
  );
};

export default TeamForm; 