import React from 'react';
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
  Heart
} from 'lucide-react';

interface SkillsDisplayProps {
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
  variant?: 'default' | 'compact' | 'detailed';
  showLevels?: boolean;
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

export function SkillsDisplay({ 
  skills, 
  variant = 'default', 
  showLevels = true,
  className = '' 
}: SkillsDisplayProps) {
  
  const renderSkillBadge = (skill: string, level?: number, type: string) => {
    const levelInfo = level ? SKILL_LEVELS.find(l => l.value === level) : null;
    const LevelIcon = levelInfo?.icon || Star;
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium text-gray-800">{skill}</span>
          {showLevels && levelInfo && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelInfo.color} flex items-center gap-1`}>
              <LevelIcon className="w-3 h-3" />
              {levelInfo.label}
            </span>
          )}
        </div>
        <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  const renderLanguageBadge = (language: { language: string; proficiency: string; iso639_1: string }) => {
    const levelColor = LANGUAGE_LEVEL_COLORS[language.proficiency as keyof typeof LANGUAGE_LEVEL_COLORS] || 'bg-gray-100 text-gray-700';
    const levelLabel = LANGUAGE_LEVEL_LABELS[language.proficiency as keyof typeof LANGUAGE_LEVEL_LABELS] || language.proficiency;
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium text-gray-800">{language.language}</span>
          {showLevels && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColor} flex items-center gap-1`}>
              <Globe2 className="w-3 h-3" />
              {levelLabel}
            </span>
          )}
        </div>
        <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  const renderCertificationBadge = (cert: { name: string; required: boolean; provider?: string }) => {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center gap-2 flex-1">
          <Award className="w-4 h-4 text-yellow-500" />
          <span className="font-medium text-gray-800">{cert.name}</span>
          {cert.provider && (
            <span className="text-sm text-gray-500">({cert.provider})</span>
          )}
        </div>
        {cert.required && (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            Required
          </span>
        )}
        <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  const renderSkillSection = (
    title: string,
    icon: React.ReactNode,
    items: any[],
    renderItem: (item: any) => React.ReactNode,
    bgColor: string,
    borderColor: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className={`bg-gradient-to-br from-${bgColor}-50 to-${bgColor}-50/30 rounded-xl p-6 border border-${borderColor}-200 shadow-sm`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 bg-${bgColor}-100 rounded-lg`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{items.length} skill{items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item, index) => (
            <div key={index}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <div className={`space-y-4 ${className}`}>
        {skills.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.languages.map((lang, index) => {
              const levelLabel = LANGUAGE_LEVEL_LABELS[lang.proficiency as keyof typeof LANGUAGE_LEVEL_LABELS] || lang.proficiency;
              return (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {lang.language} ({levelLabel})
                </span>
              );
            })}
          </div>
        )}
        
        {skills.professional.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.professional.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {skill.skill}
              </span>
            ))}
          </div>
        )}
        
        {skills.technical.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.technical.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {skill.skill}
              </span>
            ))}
          </div>
        )}
        
        {skills.soft.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.soft.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                {skill.skill}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Languages */}
      {renderSkillSection(
        'Languages',
        <Globe2 className="w-5 h-5 text-blue-600" />,
        skills.languages,
        renderLanguageBadge,
        'blue',
        'blue'
      )}

      {/* Professional Skills */}
      {renderSkillSection(
        'Professional Skills',
        <Briefcase className="w-5 h-5 text-purple-600" />,
        skills.professional,
        (skill) => renderSkillBadge(skill.skill, skill.level, 'professional'),
        'purple',
        'purple'
      )}

      {/* Technical Skills */}
      {renderSkillSection(
        'Technical Skills',
        <Target className="w-5 h-5 text-green-600" />,
        skills.technical,
        (skill) => renderSkillBadge(skill.skill, skill.level, 'technical'),
        'green',
        'green'
      )}

      {/* Soft Skills */}
      {renderSkillSection(
        'Soft Skills',
        <Users className="w-5 h-5 text-orange-600" />,
        skills.soft,
        (skill) => renderSkillBadge(skill.skill, skill.level, 'soft'),
        'orange',
        'orange'
      )}

      {/* Certifications */}
      {renderSkillSection(
        'Certifications',
        <Award className="w-5 h-5 text-yellow-600" />,
        skills.certifications,
        renderCertificationBadge,
        'yellow',
        'yellow'
      )}

      {/* Skills Summary */}
      {variant === 'detailed' && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{skills.languages.length}</div>
              <div className="text-sm text-gray-600">Languages</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{skills.professional.length}</div>
              <div className="text-sm text-gray-600">Professional</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{skills.technical.length}</div>
              <div className="text-sm text-gray-600">Technical</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{skills.soft.length}</div>
              <div className="text-sm text-gray-600">Soft Skills</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 