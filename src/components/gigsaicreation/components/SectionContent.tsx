import React from "react";
import { GigData } from "../types";
import { SectionGuidance } from "./SectionGuidance";
import BasicSection from "./BasicSection";
import { ScheduleSection } from "./ScheduleSection";
import { CommissionSection } from "./CommissionSection";
import { SkillsSection } from "./SkillsSection";
import { TeamStructure } from "./TeamStructure";
import { GigReview } from "./GigReview";
import { DaySchedule } from "../lib/scheduleUtils";
import { saveGigData, updateGigData } from '../lib/api';

interface SectionContentProps {
  section: string;
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  constants: any;
  onSectionChange?: (section: string) => void;
  isAIMode?: boolean;
  isEditMode?: boolean;
  editGigId?: string | null;
  onPublishSuccess?: () => void | Promise<void>;
}

export function SectionContent({
  section,
  data,
  onChange,
  errors,
  onSectionChange,
  isEditMode = false,
  editGigId = null,
  onPublishSuccess,
}: SectionContentProps) {

  // Log section data when component renders
  React.useEffect(() => {
  }, [section, data, errors]);

  const cleanSchedules = (schedules: DaySchedule[]): DaySchedule[] => {
    console.log('🧹 CLEAN SCHEDULES - Input schedules:', schedules);
    if (!schedules || schedules.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const cleaned: DaySchedule[] = [];

    schedules.forEach((schedule, index) => {
      console.log(`🧹 CLEAN SCHEDULES - Processing schedule ${index}:`, schedule);
      console.log(`🧹 CLEAN SCHEDULES - schedule.day:`, schedule?.day);
      console.log(`🧹 CLEAN SCHEDULES - schedule.hours:`, schedule?.hours);
      if (schedule && schedule.day && schedule.hours) {
        const key = `${schedule.day}-${schedule.hours.start}-${schedule.hours.end}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push({
            day: schedule.day,
            hours: {
              start: schedule.hours.start,
              end: schedule.hours.end
            }
          });
        }
      } else {
        console.log(`🧹 CLEAN SCHEDULES - Schedule ${index} rejected - missing day or hours`);
      }
    });

    console.log('🧹 CLEAN SCHEDULES - Final cleaned schedules:', cleaned);
    return cleaned;
  };

  // Ensure seniority object is properly initialized
  const initializedData = React.useMemo(() => {
    const schedulesToClean = data.schedule?.schedules || data.availability?.schedule || [];
    console.log('🔧 SECTION CONTENT - Initializing data');
    console.log('🔧 SECTION CONTENT - data.schedule?.schedules:', data.schedule?.schedules);
    console.log('🔧 SECTION CONTENT - data.availability?.schedule:', data.availability?.schedule);
    console.log('🔧 SECTION CONTENT - schedulesToClean:', schedulesToClean);

    const cleanedSchedules = cleanSchedules(schedulesToClean);
    console.log('🔧 SECTION CONTENT - cleanedSchedules:', cleanedSchedules);

    return {
      ...data,
      schedule: {
        schedules: cleanedSchedules,
        time_zone: (() => {
          console.log('🕐 TIMEZONE INIT - data.schedule?.time_zone:', data.schedule?.time_zone);
          console.log('🕐 TIMEZONE INIT - data.schedule?.timeZones:', data.schedule?.timeZones);
          console.log('🕐 TIMEZONE INIT - data.availability?.time_zone:', data.availability?.time_zone);

          if (data.schedule?.time_zone) {
            console.log('🕐 TIMEZONE INIT - Using schedule.time_zone:', data.schedule.time_zone);
            return data.schedule.time_zone;
          }
          if (Array.isArray(data.schedule?.timeZones) && data.schedule.timeZones.length > 0) {
            const firstTimezone = data.schedule.timeZones[0];
            if (typeof firstTimezone === 'string') {
              console.log('🕐 TIMEZONE INIT - Using first from timeZones array:', firstTimezone);
              return firstTimezone;
            }
          }
          // Also check availability as fallback
          if (data.availability?.time_zone) {
            console.log('🕐 TIMEZONE INIT - Using availability.time_zone:', data.availability.time_zone);
            return data.availability.time_zone;
          }
          console.log('🕐 TIMEZONE INIT - No timezone found, using empty string');
          return "";
        })(),
        timeZones: data.schedule?.time_zone ? [data.schedule?.time_zone] : [],
        flexibility: data.schedule?.flexibility || [],
        minimumHours: data.schedule?.minimumHours || {
          daily: undefined,
          weekly: undefined,
          monthly: undefined,
        },
        shifts: data.schedule?.shifts || []
      },
      seniority: {
        level: data.seniority?.level || '',
        yearsExperience: data.seniority?.yearsExperience || 0,
      },
      skills: {
        professional: data.skills?.professional || [{
          skill: "Brand Identity Design",
          level: 1
        }],
        technical: data.skills?.technical || [{
          skill: "Adobe Illustrator",
          level: 1
        }],
        soft: data.skills?.soft || [{
          skill: "Communication",
          level: 1
        }],
        languages: data.skills?.languages || [],

        certifications: []
      }
    };
  }, [data]);

  const renderContent = () => {
    // Correction navigation : transformer 'documentation' en 'docs' si besoin
    const effectiveSection = section as 'basic' | 'schedule' | 'commission' | 'skills' | 'team' | 'leads' | 'review';
    switch (effectiveSection) {
      case "basic":
        return (
          <BasicSection
            data={{
              ...initializedData,
              seniority: {
                ...initializedData.seniority,
                yearsExperience: initializedData.seniority.yearsExperience
              }
            }}
            onChange={onChange}
            errors={errors}
            onPrevious={() => {
              // Si onSectionChange est appelé avec 'suggestions', cela indique qu'on veut revenir aux suggestions
              onSectionChange?.('suggestions');
            }}
            onNext={() => onSectionChange?.('schedule')}
            onSave={() => { }}
            onAIAssist={() => { }}
            currentSection={section}
          />
        );

      case "schedule":
        console.log('🔄 SECTION CONTENT - Schedule case triggered');
        console.log('🔄 SECTION CONTENT - initializedData.schedule:', initializedData.schedule);
        console.log('🔄 SECTION CONTENT - initializedData.schedule.schedules:', initializedData.schedule.schedules);

        return (
          <ScheduleSection
            data={{ ...initializedData.schedule }}
            destination_zone={data.destination_zone}
            onChange={(scheduleData) => onChange({
              ...data,
              schedule: {
                schedules: scheduleData.schedules,
                time_zone: scheduleData.time_zone || "",
                timeZones: scheduleData.time_zone ? [scheduleData.time_zone] : [],
                flexibility: scheduleData.flexibility,
                minimumHours: scheduleData.minimumHours,
              },
              availability: {
                ...data.availability,
                schedule: scheduleData.schedules,
                time_zone: scheduleData.time_zone || "",
                flexibility: scheduleData.flexibility,
                minimumHours: scheduleData.minimumHours,
              }
            })}
            onPrevious={() => onSectionChange?.('basic')}
            onNext={() => onSectionChange?.('commission')}
          />
        );

      case "commission":
        return (
          <CommissionSection
            data={{
              ...initializedData,
              seniority: {
                ...initializedData.seniority,
                yearsExperience: initializedData.seniority.yearsExperience
              },
              commission: initializedData.commission || {
                commission_per_call: 0,
                bonusAmount: "0",
                currency: "",
                minimumVolume: {
                  amount: "0",
                  period: "",
                  unit: ""
                },
                transactionCommission: 0,
                kpis: [],
                additionalDetails: ""
              }
            }}
            onChange={onChange}
            errors={errors}
            warnings={{}}
            onPrevious={() => onSectionChange?.('schedule')}
            onNext={() => onSectionChange?.('skills')}
          />
        );

      // case "leads":
      //   return (
      //     <LeadsSection
      //       data={initializedData.leads || {
      //         types: [
      //           { type: 'hot', percentage: 0, description: '', conversionRate: 0 },
      //           { type: 'warm', percentage: 0, description: '', conversionRate: 0 },
      //           { type: 'cold', percentage: 0, description: '', conversionRate: 0 }
      //         ],
      //         sources: []
      //       }}
      //       onChange={(leadsData) => onChange({
      //         ...initializedData,
      //         seniority: {
      //           ...initializedData.seniority,
      //           years: String(initializedData.seniority.yearsExperience)
      //         },
      //         leads: leadsData
      //       })}
      //       errors={errors}
      //       onPrevious={() => onSectionChange?.('commission')}
      //       onNext={() => onSectionChange?.('skills')}
      //     />
      //   );

      case "skills":
        return (
          <SkillsSection
            data={{
              languages: initializedData.skills.languages,
              soft: initializedData.skills.soft.map(s => ({ skill: { $oid: s.skill }, level: s.level, details: '' })),
              professional: initializedData.skills.professional.map(s => ({ skill: { $oid: s.skill }, level: s.level, details: '' })),
              technical: initializedData.skills.technical.map(s => ({ skill: { $oid: s.skill }, level: s.level, details: '' })),
              certifications: []
            }}
            onChange={(skillsData) => onChange({
              ...initializedData,
              seniority: {
                ...initializedData.seniority,
                yearsExperience: initializedData.seniority.yearsExperience
              },
              skills: {
                // Preserve existing skills data
                ...initializedData.skills,
                // Update with new skills data, preserving existing skills
                languages: skillsData.languages?.map((lang: string | { language: string; proficiency: string; iso639_1: string }) => ({
                  language: typeof lang === 'string' ? lang : lang.language,
                  proficiency: typeof lang === 'string' ? 'A1' : (lang.proficiency || 'A1'),
                  iso639_1: '' // This will be handled by the backend
                })) || initializedData.skills.languages,
                soft: skillsData.soft?.map((skill: string | { skill: { $oid: string } | string; level: number }) => ({
                  skill: typeof skill === 'string' ? skill :
                    typeof skill.skill === 'string' ? skill.skill :
                      skill.skill.$oid,
                  level: typeof skill === 'string' ? 1 : Number(skill.level)
                })) || initializedData.skills.soft,
                professional: skillsData.professional?.map((skill: string | { skill: { $oid: string } | string; level: number }) => ({
                  skill: typeof skill === 'string' ? skill :
                    typeof skill.skill === 'string' ? skill.skill :
                      skill.skill.$oid,
                  level: typeof skill === 'string' ? 1 : Number(skill.level)
                })) || initializedData.skills.professional,

                technical: skillsData.technical?.map((skill: string | { skill: { $oid: string } | string; level: number }) => ({
                  skill: typeof skill === 'string' ? skill :
                    typeof skill.skill === 'string' ? skill.skill :
                      skill.skill.$oid,
                  level: typeof skill === 'string' ? 1 : Number(skill.level)
                })) || initializedData.skills.technical
              }
            })}
            errors={errors}
            onPrevious={() => onSectionChange?.('leads')}
            onNext={() => onSectionChange?.('team')}
          />
        );

      case "team":
        return (
          <TeamStructure
            data={{
              ...initializedData,
              seniority: {
                ...initializedData.seniority,
                yearsExperience: initializedData.seniority.yearsExperience
              }
            }}
            onChange={onChange}
            errors={errors}
            onPrevious={() => onSectionChange?.('skills')}
            onNext={() => onSectionChange?.('review')}
            currentSection={section as 'basic' | 'schedule' | 'commission' | 'leads' | 'skills' | 'team'}
          />
        );



      case "review":
        return (
          <GigReview
            data={{
              ...initializedData,
              seniority: {
                ...initializedData.seniority,
                yearsExperience: initializedData.seniority.yearsExperience
              }
            }}
            onEdit={(section) => {
              onSectionChange?.(section);
            }}
            isSubmitting={false}
            onBack={() => {
              onSectionChange?.('team');
            }}
            onSubmit={async () => {

              try {
                // Save or update gig data to API based on mode
                const result = isEditMode && editGigId
                  ? await updateGigData(editGigId, initializedData)
                  : await saveGigData(initializedData);

                if (result.error) {
                  console.error('Error saving/updating gig:', result.error);
                  return;
                }
              } catch (error) {
                console.error('Error in gig submission:', error);
              }
            }}
            isEditMode={isEditMode}
            editGigId={editGigId}
            onPublishSuccess={onPublishSuccess}
          />
        );

      default:
        return null;
    }
  };
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-white/20 p-8 rounded-xl shadow-lg">
      <SectionGuidance section={section} />
      {renderContent()}
    </div>
  );
}

