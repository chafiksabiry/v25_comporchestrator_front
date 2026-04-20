import React, { useEffect, useState } from 'react';
import { getGig } from '../lib/api';
import { GigDetails } from './GigDetails';
import { Loader2 } from 'lucide-react';
import { GigData } from '../types';
import Logo from './Logo';

interface GigViewProps {
  selectedGigId: string | null;
  onSelectGig: (id: string) => void;
}

const GigView: React.FC<GigViewProps> = ({ selectedGigId, onSelectGig }) => {
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigData | null>(null);

  useEffect(() => {
    async function loadGigs() {
      try {
        const { data, error } = await getGig(selectedGigId);

        if (error) throw error;

        if (data) {
          setGigs(data);
          if (selectedGigId) {
            const selected = data.find((g: { id: string }) => g.id === selectedGigId);
            if (selected) {
              const transformedData = transformGigData(selected);
              setSelectedGig(transformedData);
            }
          }
        }
      } catch (error) {
        console.error('Error loading gigs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGigs();
  }, [selectedGigId]);

  // Transform database gig data to GigData format
  const transformGigData = (gig: any): GigData => ({
    userId: gig.userId,
    companyId: gig.companyId,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    destination_zone: gig.destination_zone || "",
    callTypes: gig.call_types || [],
    highlights: [],
    industries: gig.industries || [],
    status: gig.status || 'to_activate',
    requirements: {
      essential: [],
      preferred: []
    },
    benefits: [],
    availability: {
      schedule: gig.schedule_schedules || [
        {
          day: "",
          hours: {
            start: "",
            end: ""
          }
        }
      ],
      timeZones: gig.schedule_timezone || "",
      time_zone: gig.schedule_timezone || "",
      flexibility: gig.schedule_flexibility ? [gig.schedule_flexibility] : [],
      minimumHours: {
        daily: gig.minimum_hours_daily,
        weekly: gig.minimum_hours_weekly,
        monthly: gig.minimum_hours_monthly
      }
    },
    schedule: {
      schedules: gig.schedule_schedules || [
        {
          day: "",
          hours: {
            start: "",
            end: ""
          }
        }
      ],
      timeZones: gig.schedule_timezone || "",
      time_zone: gig.schedule_timezone || "",
      flexibility: gig.schedule_flexibility ? [gig.schedule_flexibility] : [],
      minimumHours: {
        daily: gig.minimum_hours_daily,
        weekly: gig.minimum_hours_weekly,
        monthly: gig.minimum_hours_monthly
      }
    },
    commission: {
      commission_per_call: gig.commission_per_call || 0,
      bonusAmount: gig.commission_bonus_amount || 0,
      currency: gig.commission_currency || 'USD',
      minimumVolume: gig.minimum_volume || {
        amount: 0,
        period: '',
        unit: ''
      },
      transactionCommission: gig.transaction_commission || 0,
      kpis: gig.commission_kpis || [],
      additionalDetails: gig.additional_details || ''
    },
    leads: {
      types: gig.gig_leads?.map((lead: any) => ({
        type: lead.lead_type,
        percentage: lead.percentage,
        description: lead.description,
        conversionRate: lead.conversion_rate
      })) || [],
      sources: gig.gig_leads?.[0]?.sources || [],
      distribution: {
        method: '',
        rules: []
      },
      qualificationCriteria: []
    },
    skills: {
      languages: gig.gig_skills
        ?.filter((skill: any) => skill.category === 'language')
        .map((skill: any) => ({
          language: skill.language,
          proficiency: skill.proficiency,
          iso639_1: skill.iso639_1
        })) || [],
      soft: gig.gig_skills
        ?.filter((skill: any) => skill.category === 'soft')
        .map((skill: any) => ({
          skill: skill.skill,
          level: skill.level,
        })) || [],
      professional: gig.gig_skills
        ?.filter((skill: any) => skill.category === 'professional')
        .map((skill: any) => ({
          skill: skill.skill,
          level: skill.level,
        })) || [],
      technical: gig.gig_skills
        ?.filter((skill: any) => skill.category === 'technical')
        .map((skill: any) => ({
          skill: skill.skill,
          level: skill.level,
        })) || [],
      certifications: []
    },
    seniority: {
      level: gig.seniority_level || '',
      yearsExperience: gig.years_experience || 0,
    },
    team: {
      size: gig.team_size || 0,
      structure: gig.team_structure || [],
      territories: gig.team_territories || [],
      reporting: {
        to: '',
        frequency: ''
      },
      collaboration: []
    },
    tools: {
      provided: [],
      required: []
    },
    training: {
      initial: {
        duration: '',
        format: '',
        topics: []
      },
      ongoing: {
        frequency: '',
        format: '',
        topics: []
      },
      support: []
    },
    metrics: {
      kpis: [],
      targets: {},
      reporting: {
        frequency: '',
        metrics: []
      }
    },

    compliance: {
      requirements: [],
      certifications: [],
      policies: []
    },
    equipment: {
      required: [],
      provided: []
    },
    documentation: gig.documentation || {},
    activities: gig.activities || [],
    activity: gig.activity || { options: [] }
  } as GigData);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 text-harx-600 animate-spin" />
      </div>
    );
  }

  if (selectedGig) {
    return (
      <GigDetails
        data={selectedGig}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <Logo className="mb-6" />
      </div>

      {gigs.map((gig) => (
        <div
          key={gig.id}
          onClick={() => {
            const transformedData = transformGigData(gig);
            setSelectedGig(transformedData);
            onSelectGig(gig.id);
          }}
          className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-200 p-6 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              {/* Logo */}
              {/* Remove the logo rendering block that uses gig.logoUrl */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{gig.title}</h2>
                  <p className="text-gray-600 line-clamp-2">{gig.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-harx-100 text-harx-800 px-3 py-1 rounded-full text-sm">
                    {gig.category}
                  </span>
                  <span className="bg-harx-alt-100 text-harx-alt-800 px-3 py-1 rounded-full text-sm">
                    {gig.seniority_level}
                  </span>
                  <span className="bg-harx-100 text-harx-800 px-3 py-1 rounded-full text-sm">
                    {gig.team_size}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Base Commission</div>
              <div className="font-semibold text-gray-900">
                {typeof gig.commission_currency === 'string' ? gig.commission_currency : (gig.commission_currency?.$oid || 'USD')} {gig.commission_per_call}
              </div>
              {gig.commission_bonus && (
                <div className="mt-1 text-sm text-harx-600">
                  + Performance Bonus
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GigView;
