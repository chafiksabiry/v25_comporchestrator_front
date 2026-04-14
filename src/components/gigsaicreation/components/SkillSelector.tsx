import { Plus, X } from 'lucide-react';
import { predefinedOptions } from '../lib/guidance';

interface SkillSelectorProps {
  skills: Array<{ name: string; level?: string }>;
  onChange: (skills: Array<{ name: string; level?: string }>) => void;
  type: 'language' | 'professional' | 'soft' | 'technical' | 'tools';
  showLevel?: boolean;
}

export function SkillSelector({ skills, onChange, type, showLevel = false }: SkillSelectorProps) {
  // Get the correct options based on type
  const getOptions = () => {
    switch (type) {
      case 'language':
        return predefinedOptions.skills.languages.map(lang => lang.language);
      case 'technical':
        return (predefinedOptions.skills as any).technical.map((skill: any) => skill.skill);
      case 'soft':
        return (predefinedOptions.skills as any).soft.map((skill: any) => skill.skill);
      case 'professional':
        return (predefinedOptions.skills as any).professional.map((skill: any) => skill.skill);
      default:
        return [];
    }
  };

  const options = getOptions();
  const levels = showLevel ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] : [];

  const handleAdd = () => {
    onChange([...skills, { name: '', level: showLevel ? levels[0] : undefined }]);
  };

  const handleRemove = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'name' | 'level', value: string) => {
    const newSkills = [...skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    onChange(newSkills);
  };

  return (
    <div className="space-y-3">
      {skills.map((skill, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <select
              value={skill.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-harx-500 focus:border-harx-500"
            >
              <option value="">Select {type}</option>
              {options.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {showLevel && (
            <div className="w-40">
              <select
                value={skill.level}
                onChange={(e) => handleChange(index, 'level', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-harx-500 focus:border-harx-500"
              >
                <option value="">Select level</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => handleRemove(index)}
            className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="flex items-center gap-2 text-harx-600 hover:text-harx-800"
      >
        <Plus className="w-5 h-5" />
        <span>Add {type}</span>
      </button>
    </div>
  );
}