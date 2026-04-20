import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { saveGigData } from '../lib/api';
import {
  Calendar, Clock, DollarSign, Users, Globe2,
  Award, Briefcase, FileText, Building2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Logo from './Logo';
import type { ParsedGig } from '../lib/types';

interface GigFormProps {
  gig: ParsedGig;
  onSave: (updatedGig: ParsedGig) => void;
  onCancel: () => void;
}

type GigFormData = {
  title: string;
  description: string;
  category: string;
  callTypes: string[];
  availability: {
    schedule: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  schedule: {
    schedules: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    commission_per_call: number;
    bonusAmount: number;
    currency: string;
    minimumVolume: {
      amount: number;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails: string;
  };
  leads: {
    types: {
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
    }[];
    sources: string[];
  };
  skills: {
    languages: {
      language: string;
      proficiency: string;
      iso639_1: string;
      _id?: { $oid: string };
    }[];
    soft: {
      skill: string;
      level: number;
    }[];
    professional: {
      skill: string;
      level: number;
    }[];
    technical: {
      skill: string;
      level: number;
    }[];
    certifications: string[];
    industry: string[];
  };
  seniority: {
    level: string;
    yearsExperience: number;
  };
  team: {
    size: number;
    structure: string[];
    territories: string[];
  };
  prerequisites: string[];

};

interface GigData {
  companyId: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  destination_zone: string;
  callTypes: string[];
  highlights: any[];
  industries: string[];
  activities: string[];
  activity: {
    options: Array<{
      type: string;
      description: string;
      requirements: string[];
    }>;
  };
  status?: 'to_activate' | 'active' | 'inactive' | 'archived';
  requirements: {
    essential: any[];
    preferred: any[];
  };
  benefits: any[];
  availability: {
    schedule: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    time_zone: string;
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  schedule: {
    schedules: {
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }[];
    timeZones: string[];
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
  commission: {
    commission_per_call: number;
    bonusAmount: number;
    currency: string;
    minimumVolume: {
      amount: number;
      period: string;
      unit: string;
    };
    transactionCommission: number;
    additionalDetails?: string;
  };
  leads: {
    types: {
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
    }[];
    sources: string[];
    distribution: {
      method: string;
      rules: any[];
    };
    qualificationCriteria: any[];
  };
  skills: {
    languages: {
      language: string;
      proficiency: string;
      iso639_1: string;
    }[];
    soft: {
      skill: string;
      level: number;
    }[];
    professional: {
      skill: string;
      level: number;
    }[];
    technical: {
      skill: string;
      level: number;
    }[];
    certifications: string[];
  };
  seniority: {
    level: string;
    yearsExperience: number;
  };
  team: {
    size: number;
    structure: {
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: number;
      };
    }[];
    territories: string[];
    reporting: {
      to: string;
      frequency: string;
    };
    collaboration: any[];
  };

  tools: {
    provided: any[];
    required: any[];
  };
  training: {
    initial: {
      duration: string;
      format: string;
      topics: any[];
    };
    ongoing: {
      frequency: string;
      format: string;
      topics: any[];
    };
    support: any[];
  };
  metrics: {
    kpis: any[];
    targets: Record<string, any>;
    reporting: {
      frequency: string;
      metrics: any[];
    };
  };
  compliance: {
    requirements: any[];
    certifications: any[];
    policies: any[];
  };
  equipment: {
    required: any[];
    provided: any[];
  };
}

const API_URL = import.meta.env.VITE_API_URL_GIGS || 'http://localhost:3000';

export function GigForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<GigFormData>();

  const onSubmit = async (data: GigFormData) => {
    try {
      // Insert main gig data
      const gigData: GigData = {
        companyId: Cookies.get('companyId') || "",
        userId: Cookies.get('userId') || "",
        title: data.title,
        description: data.description,
        category: data.category,
        destination_zone: "",
        callTypes: data.callTypes,
        highlights: [],
        industries: [],
        activities: [],
        activity: {
          options: []
        },
        status: 'to_activate',
        requirements: {
          essential: [],
          preferred: []
        },
        benefits: [],
        availability: {
          schedule: data.schedule?.schedules || [
            {
              day: "",
              hours: {
                start: "",
                end: ""
              }
            }
          ],
          timeZones: Array.isArray(data.schedule?.timeZones) ? data.schedule.timeZones : (data.schedule?.timeZones ? [data.schedule.timeZones] : []),
          time_zone: Array.isArray(data.schedule?.timeZones) ? data.schedule.timeZones[0] || "" : (data.schedule?.timeZones || ""),
          flexibility: Array.isArray(data.schedule?.flexibility) ? data.schedule.flexibility : (data.schedule?.flexibility ? [data.schedule.flexibility] : []),
          minimumHours: {
            daily: undefined,
            weekly: undefined,
            monthly: undefined
          }
        },
        schedule: {
          schedules: data.schedule?.schedules || [
            {
              day: "",
              hours: {
                start: "",
                end: ""
              }
            }
          ],
          timeZones: Array.isArray(data.schedule?.timeZones) ? data.schedule.timeZones : (data.schedule?.timeZones ? [data.schedule.timeZones] : []),
          flexibility: Array.isArray(data.schedule?.flexibility) ? data.schedule.flexibility : (data.schedule?.flexibility ? [data.schedule.flexibility] : []),
          minimumHours: {
            daily: undefined,
            weekly: undefined,
            monthly: undefined
          }
        },
        commission: {
          commission_per_call: data.commission.commission_per_call,
          bonusAmount: data.commission.bonusAmount,
          currency: "USD",
          minimumVolume: {
            amount: 0,
            period: "",
            unit: ""
          },
          transactionCommission: data.commission.transactionCommission,
          additionalDetails: data.commission.additionalDetails || ""
        },
        leads: {
          types: data.leads.types,
          sources: data.leads.sources,
          distribution: {
            method: "",
            rules: []
          },
          qualificationCriteria: []
        },
        skills: {
          languages: data.skills.languages,
          soft: data.skills.soft.map(skill => ({
            skill: skill.skill,
            level: skill.level
          })),
          professional: data.skills.professional.map(skill => ({
            skill: skill.skill,
            level: skill.level
          })),
          technical: data.skills.technical.map(skill => ({
            skill: skill.skill,
            level: skill.level
          })),
          certifications: []
        },
        seniority: {
          level: data.seniority.level,
          yearsExperience: data.seniority.yearsExperience,
        },
        team: {
          size: data.team?.size || 0,
          structure: (data.team?.structure || []).map(role => ({
            roleId: role,
            count: 1,
            seniority: {
              level: "",
              yearsExperience: 0
            }
          })),
          territories: data.team?.territories || [],
          reporting: {
            to: "",
            frequency: ""
          },
          collaboration: []
        },

        tools: {
          provided: [],
          required: []
        },
        training: {
          initial: {
            duration: "",
            format: "",
            topics: []
          },
          ongoing: {
            frequency: "",
            format: "",
            topics: []
          },
          support: []
        },
        metrics: {
          kpis: [],
          targets: {},
          reporting: {
            frequency: "",
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
        }
      };

      const { data: gig, error: gigError } = await saveGigData(gigData);

      if (gigError) throw gigError;

      // Insert skills
      const skillsPromises = [
        ...data.skills.languages.map(lang => ({
          gig_id: gig.id,
          category: 'language',
          language: lang.language,
          proficiency: lang.proficiency,
          iso639_1: lang.iso639_1
        })),
        ...data.skills.soft.map(skill => ({
          gig_id: gig.id,
          category: 'soft',
          name: skill
        })),
        ...data.skills.professional.map(skill => ({
          gig_id: gig.id,
          category: 'professional',
          name: skill
        })),
        ...data.skills.industry.map(skill => ({
          gig_id: gig.id,
          category: 'industry',
          name: skill
        }))
      ];

      const skillsResponse = await axios.post(`${API_URL}/gig_skills`, skillsPromises);
      if (!skillsResponse.data) throw new Error('Failed to save skills');

      // Insert leads
      const leadsResponse = await axios.post(`${API_URL}/gig_leads`, {
        gig_id: gig.id,
        leads: data.leads.types.map(lead => ({
          lead_type: lead.type,
          percentage: lead.percentage,
          description: lead.description,
          sources: data.leads.sources
        }))
      });
      if (!leadsResponse.data) throw new Error('Failed to save leads');



      const confirmed = window.confirm('Gig created successfully! Click OK to continue or Cancel to stay on this page.');
      if (confirmed) {
        // User clicked OK - could add navigation logic here if needed
      } else {
        // User clicked Cancel - stay on current page
      }
    } catch (error) {
      console.error('Error creating gig:', error);
      const retry = window.confirm('Error creating gig. Click OK to try again or Cancel to continue.');
      if (retry) {
        // Could add retry logic here
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-center py-8">
        <Logo className="mb-6" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full py-8 px-4">
        <div className="space-y-8">
          {/* Basic Information */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  {...register('title', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-harx-500 focus:ring-harx-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  {...register('description', { required: true })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-harx-500 focus:ring-harx-500"
                />
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Calendar className="w-6 h-6 text-harx-500 mr-2" />
              <h2 className="text-2xl font-semibold">Schedule</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Working Hours</label>
                <input
                  type="text"
                  {...register('schedule.schedules.0.hours.start', { required: true })}
                  placeholder="e.g., 08h00 - 17h00 EST"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-harx-500 focus:ring-harx-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Zones</label>
                <input
                  type="text"
                  {...register('schedule.timeZones', { required: true })}
                  placeholder="e.g., EST, CST, PST"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-harx-500 focus:ring-harx-500"
                />
              </div>
            </div>
          </section>

          {/* Skills */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Award className="w-6 h-6 text-harx-alt-500 mr-2" />
              <h2 className="text-2xl font-semibold">Required Skills</h2>
            </div>
            <div className="space-y-6">
              {/* Languages */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Languages</h3>
                <div className="space-y-2">
                  {/* Add dynamic language fields */}
                </div>
              </div>

              {/* Soft Skills */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Soft Skills</h3>
                <div className="space-y-2">
                  {/* Add dynamic soft skills fields */}
                </div>
              </div>

              {/* Professional Skills */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Professional Skills</h3>
                <div className="space-y-2">
                  {/* Add dynamic professional skills fields */}
                </div>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-harx-500 text-white py-2 px-4 rounded-lg hover:bg-harx-600 transition-colors"
            >
              Create Gig
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
