import React from 'react';
import { GigCreator } from '../components/GigCreator';
import BasicSection from '../components/BasicSection';
import { ScheduleSection } from '../components/ScheduleSection';
import { CommissionSection } from '../components/CommissionSection';
import { SkillsSection } from '../components/SkillsSection';
import { TeamStructure } from '../components/TeamStructure';

import Logo from '../components/Logo';
import { GigData } from '../types';
import { TimezoneCode } from '../lib/ai';

interface GigCreatorProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  onAIAssist: () => void;
  currentSection: string;
}

export function CreateGig() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-center py-8">
        <Logo className="mb-6" />
      </div>
      <GigCreator>
        {({
          data,
          onChange,
          errors,
          onPrevious,
          onNext,
          onSave,
          onAIAssist,
          currentSection
        }: GigCreatorProps) => {
          switch (currentSection) {
            case 'basic':
              return (
                <BasicSection
                  data={data}
                  onChange={onChange}
                  errors={errors}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  onSave={onSave}
                  onAIAssist={onAIAssist}
                  currentSection={currentSection}
                />
              );
            
            case 'schedule':
              return (
                <ScheduleSection
                  data={data.schedule ? {
                    schedules: data.schedule.schedules || [],
                    time_zone: (() => {
                      if (data.schedule.time_zone) {
                        return data.schedule.time_zone;
                      }
                      if (Array.isArray(data.schedule.timeZones) && data.schedule.timeZones.length > 0) {
                        const firstTimezone = data.schedule.timeZones[0];
                        if (typeof firstTimezone === 'string') {
                          return firstTimezone;
                        }
                      }
                      return "";
                    })(),
                    flexibility: data.schedule.flexibility || [],
                    minimumHours: data.schedule.minimumHours || {
                      daily: undefined,
                      weekly: undefined,
                      monthly: undefined,
                    }
                  } : {
                    schedules: [],
                    time_zone: "",
                    flexibility: [],
                    minimumHours: {
                      daily: undefined,
                      weekly: undefined,
                      monthly: undefined,
                    }
                  }}
                  destination_zone={data.destination_zone}
                  onChange={(scheduleData) => onChange({
                    ...data,
                    schedule: {
                      schedules: scheduleData.schedules,
                      time_zone: scheduleData.time_zone,
                      timeZones: scheduleData.time_zone ? [scheduleData.time_zone] : [],
                      flexibility: scheduleData.flexibility,
                      minimumHours: scheduleData.minimumHours,
                    },
                  })}
                  onPrevious={onPrevious}
                  onNext={onNext}
                />
              );
            
            case 'commission':
              return (
                <CommissionSection
                  data={data}
                  onChange={onChange}
                  errors={errors}
                  warnings={{}}
                  onPrevious={onPrevious}
                  onNext={onNext}
                />
              );
            
            case 'skills':
              return (
                <SkillsSection
                  data={data.skills}
                  onChange={(skillsData) => onChange({
                    ...data,
                    skills: {
                      ...skillsData,
                      languages: skillsData.languages.map((lang: string | { language: string; proficiency: string; iso639_1: string }) => ({
                        language: typeof lang === 'string' ? lang : lang.language,
                        proficiency: typeof lang === 'string' ? 'A1' : (lang.proficiency || 'A1'),
                        iso639_1: '' // This will be handled by the backend
                      })),
                      soft: skillsData.soft.map((skill: string | { skill: string; level: number }) => ({
                        skill: typeof skill === 'string' ? skill : skill.skill,
                        level: typeof skill === 'string' ? 1 : Number(skill.level)
                      })),
                      professional: skillsData.professional.map((skill: string | { skill: string; level: number }) => ({
                        skill: typeof skill === 'string' ? skill : skill.skill,
                        level: typeof skill === 'string' ? 1 : Number(skill.level)
                      })),
                      certifications: skillsData.certifications.map((cert: string | { name: string; required: boolean; provider?: string }) => ({
                        name: typeof cert === 'string' ? cert : cert.name,
                        required: typeof cert === 'string' ? true : cert.required,
                        provider: typeof cert === 'string' ? '' : cert.provider
                      })),
                      technical: skillsData.technical.map((skill: string | { skill: string; level: number }) => ({
                        skill: typeof skill === 'string' ? skill : skill.skill,
                        level: typeof skill === 'string' ? 1 : Number(skill.level)
                      }))
                    }
                  })}
                  errors={errors}
                  onPrevious={onPrevious}
                  onNext={onNext}
                />
              );
            
            case 'team':
              return (
                <TeamStructure
                  data={data}
                  onChange={onChange}
                  errors={errors}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  currentSection={currentSection}
                />
              );
            

            
            default:
              return null;
          }
        }}
      </GigCreator>
    </div>
  );
}

export default CreateGig; 