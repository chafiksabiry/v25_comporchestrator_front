import React, { useState } from 'react';
import { 
  Globe2, 
  Briefcase, 
  Target, 
  Users, 
  Award, 
  CheckCircle, 
  Star,
  TrendingUp,
  Zap,
  Heart,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus
} from 'lucide-react';

interface SkillsCardProps {
  skills: {
    languages: Array<{ 
      language: string; 
      proficiency: string;
      iso639_1: string;
    }>;
    soft: Array<{
      skill: string;
      level: number;
    }>;
    professional: Array<{
      skill: string;
      level: number;
    }>;
    technical: Array<{
      skill: string;
      level: number;
    }>;
    certifications: Array<{
      name: string;
      required: boolean;
      provider?: string;
    }>;
  };
  title?: string;
  subtitle?: string;
  editable?: boolean;
  onEdit?: () => void;
  onAdd?: () => void;
  className?: string;
}

const SKILL_LEVELS = [
  { value: 1, label: 'Basic', color: 'bg-gray-100 text-gray-700', icon: Star },
  { value: 2, label: 'Intermediate', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
  { value: 3, label: 'Advanced', color: 'bg-purple-100 text-purple-700', icon: Zap },
  { value: 4, label: 'Expert', color: 'bg-green-100 text-green-700', icon: Award },
  { value: 5, label: 'Master', color: 'bg-red-100 text-red-700', icon: Heart }
];

const LANGUAGE_LEVEL_COLORS = {
  'A1': 'bg-gray-100 text-gray-700',
  'A2': 'bg-blue-100 text-blue-700',
  'B1': 'bg-yellow-100 text-yellow-700',
  'B2': 'bg-orange-100 text-orange-700',
  'C1': 'bg-purple-100 text-purple-700',
  'C2': 'bg-green-100 text-green-700'
};

const LANGUAGE_LEVEL_LABELS = {
  'A1': 'A1 - Beginner',
  'A2': 'A2 - Elementary',
  'B1': 'B1 - Intermediate',
  'B2': 'B2 - Upper Intermediate',
  'C1': 'C1 - Advanced',
  'C2': 'C2 - Mastery'
};

export function SkillsCard({ 
  skills, 
  title = "Required Skills",
  subtitle = "Skills and competencies for this position",
  editable = false,
  onEdit,
  onAdd,
  className = '' 
}: SkillsCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['languages', 'professional', 'technical', 'soft', 'certifications']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSkillCount = (section: keyof typeof skills) => {
    return skills[section].length;
  };

  const getTotalSkills = () => {
    return Object.values(skills).reduce((total, section) => total + section.length, 0);
  };

  const renderSkillItem = (skill: any, type: string, index: number) => {
    if (type === 'languages') {
      const levelColor = LANGUAGE_LEVEL_COLORS[skill.proficiency as keyof typeof LANGUAGE_LEVEL_COLORS] || 'bg-gray-100 text-gray-700';
      const levelLabel = LANGUAGE_LEVEL_LABELS[skill.proficiency as keyof typeof LANGUAGE_LEVEL_LABELS] || skill.proficiency;
      return (
        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3">
            <Globe2 className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-800">{skill.language}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColor}`}>
              {levelLabel}
            </span>
          </div>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
      );
    }

    if (type === 'certifications') {
      return (
        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3">
            <Award className="w-4 h-4 text-yellow-500" />
            <div>
              <span className="font-medium text-gray-800">{skill.name}</span>
              {skill.provider && (
                <span className="text-sm text-gray-500 ml-2">({skill.provider})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {skill.required && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                Required
              </span>
            )}
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        </div>
      );
    }

    // For other skill types
    const levelInfo = SKILL_LEVELS.find(l => l.value === skill.level);
    const LevelIcon = levelInfo?.icon || Star;
    
    return (
      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3">
          {type === 'professional' && <Briefcase className="w-4 h-4 text-purple-500" />}
          {type === 'technical' && <Target className="w-4 h-4 text-green-500" />}
          {type === 'soft' && <Users className="w-4 h-4 text-orange-500" />}
          <span className="font-medium text-gray-800">{skill.skill}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelInfo?.color} flex items-center gap-1`}>
            <LevelIcon className="w-3 h-3" />
            {levelInfo?.label}
          </span>
        </div>
        <CheckCircle className="w-4 h-4 text-green-500" />
      </div>
    );
  };

  const renderSection = (type: string, title: string, icon: React.ReactNode, color: string) => {
    const items = skills[type as keyof typeof skills];
    const isExpanded = expandedSections.has(type);
    const count = items.length;

    if (count === 0) return null;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(type)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${color}-100 rounded-lg`}>
              {icon}
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{count} skill{count > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white space-y-3">
            {items.map((item, index) => renderSkillItem(item, type, index))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-blue-100 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold">{getTotalSkills()}</div>
              <div className="text-sm text-blue-100">Total Skills</div>
            </div>
            {editable && (
              <div className="flex gap-2">
                {onAdd && (
                  <button
                    onClick={onAdd}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
                    title="Add Skill"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
                    title="Edit Skills"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Summary */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl font-bold text-blue-600">{getSkillCount('languages')}</div>
            <div className="text-xs text-gray-600">Languages</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl font-bold text-purple-600">{getSkillCount('professional')}</div>
            <div className="text-xs text-gray-600">Professional</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl font-bold text-green-600">{getSkillCount('technical')}</div>
            <div className="text-xs text-gray-600">Technical</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl font-bold text-orange-600">{getSkillCount('soft')}</div>
            <div className="text-xs text-gray-600">Soft Skills</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl font-bold text-yellow-600">{getSkillCount('certifications')}</div>
            <div className="text-xs text-gray-600">Certifications</div>
          </div>
        </div>
      </div>

      {/* Skills Sections */}
      <div className="p-6 space-y-4">
        {renderSection('languages', 'Languages', <Globe2 className="w-5 h-5 text-blue-600" />, 'blue')}
        {renderSection('professional', 'Professional Skills', <Briefcase className="w-5 h-5 text-purple-600" />, 'purple')}
        {renderSection('technical', 'Technical Skills', <Target className="w-5 h-5 text-green-600" />, 'green')}
        {renderSection('soft', 'Soft Skills', <Users className="w-5 h-5 text-orange-600" />, 'orange')}
        {renderSection('certifications', 'Certifications', <Award className="w-5 h-5 text-yellow-600" />, 'yellow')}
      </div>
    </div>
  );
} 