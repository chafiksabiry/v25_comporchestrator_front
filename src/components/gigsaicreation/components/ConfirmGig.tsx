import React from "react";
import Swal from "sweetalert2";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { GigData } from "../types";
import Cookies from 'js-cookie';
import { saveGigData } from '../lib/api';

interface ConfirmGigProps {
  gig: GigData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmGig: React.FC<ConfirmGigProps> = ({ gig, onConfirm, onCancel }) => {
  const handleConfirm = async () => {
    try {
      let userId: string;
      let companyId: string;

      companyId = Cookies.get('companyId') || "";
      userId = Cookies.get('userId') || "";

      if (!userId || !companyId) {
        throw new Error("User ID or Company ID not found in cookies");
      }

      const gigData: GigData = {
        ...gig,
        userId: Cookies.get('userId') || "",
        companyId: Cookies.get('companyId') || "",
        category: gig.category || "",
        destination_zone: gig.destination_zone || "",
        callTypes: gig.callTypes || [],
        highlights: gig.highlights || [],
        requirements: {
          essential: gig.requirements?.essential || [],
          preferred: gig.requirements?.preferred || []
        },
        benefits: gig.benefits || [],
        availability: {
          schedule: gig.schedule?.schedules?.map((schedule: { day: any[]; hours: { start: any; end: any; }; }) => ({
            day: schedule.day?.[0] || "",
            hours: {
              start: schedule.hours?.start || "",
              end: schedule.hours?.end || ""
            }
          })) || [],
          timeZones: Array.isArray(gig.schedule?.timeZones) ? gig.schedule.timeZones : (gig.schedule?.timeZones ? [gig.schedule.timeZones] : []),
          time_zone: gig.schedule?.time_zone || (Array.isArray(gig.schedule?.timeZones) ? gig.schedule.timeZones[0] : ""),
          flexibility: gig.schedule?.flexibility || [],
          minimumHours: gig.schedule?.minimumHours || {
            daily: 0,
            weekly: 0,
            monthly: 0
          }
        },
        schedule: {
          schedules: gig.schedule?.schedules?.map((schedule: { day: any; hours: { start: any; end: any; }; }) => ({
            day: schedule.day || "",
            hours: {
              start: schedule.hours?.start || "",
              end: schedule.hours?.end || ""
            }
          })) || [],
          timeZones: Array.isArray(gig.schedule?.timeZones) ? gig.schedule.timeZones : (gig.schedule?.timeZones ? [gig.schedule.timeZones] : []),
          flexibility: gig.schedule?.flexibility || [],
          minimumHours: gig.schedule?.minimumHours || {},
        },
        commission: {
          commission_per_call: gig.commission?.commission_per_call || 0,
          bonusAmount: gig.commission?.bonusAmount || 0,
          currency: gig.commission?.currency || "",
          minimumVolume: {
            amount: gig.commission?.minimumVolume?.amount || 0,
            period: gig.commission?.minimumVolume?.period || "",
            unit: gig.commission?.minimumVolume?.unit || ""
          },
          transactionCommission: gig.commission?.transactionCommission || 0,
          additionalDetails: gig.commission?.additionalDetails || ""
        },
        leads: {
          types: gig.leads?.types || [],
          sources: gig.leads?.sources || [],
          distribution: {
            method: gig.leads?.distribution?.method || "",
            rules: gig.leads?.distribution?.rules || []
          },
          qualificationCriteria: gig.leads?.qualificationCriteria || []
        },
        skills: {
          languages: gig.skills?.languages.map((lang: { language: any; proficiency: any; iso639_1: any; }) => ({
            language: lang.language,
            proficiency: lang.proficiency,
            iso639_1: lang.iso639_1
          })) || [],
          soft: gig.skills?.soft.map((skill: { skill: any; level: any; }) => ({
            skill: skill.skill,
            level: skill.level,
            details: ""
          })) || [],
          professional: gig.skills?.professional.map((skill: { skill: any; level: any; }) => ({
            skill: skill.skill,
            level: skill.level,
            details: ""
          })) || [],
          technical: gig.skills?.technical.map((skill: { skill: any; level: any; }) => ({
            skill: skill.skill,
            level: skill.level,
            details: ""
          })) || [],
          certifications: gig.skills?.certifications || []
        },
        seniority: {
          level: gig.seniority?.level || "",
          yearsExperience: typeof gig.seniority?.yearsExperience === 'string' ? parseInt(gig.seniority.yearsExperience) || 0 : gig.seniority?.yearsExperience || 0
        },
        team: {
          size: gig.team?.size || 0,
          structure: gig.team?.structure || [],
          territories: gig.team?.territories || [],
          reporting: {
            to: gig.team?.reporting?.to || "",
            frequency: gig.team?.reporting?.frequency || ""
          },
          collaboration: gig.team?.collaboration || []
        },
        documentation: {
          product: gig.documentation?.product || [],
          process: gig.documentation?.process || [],
          training: gig.documentation?.training || [],
          reference: gig.documentation?.reference || [],
          templates: gig.documentation?.templates || []
        },
        tools: {
          provided: gig.tools?.provided || [],
          required: gig.tools?.required || []
        },
        training: {
          initial: {
            duration: gig.training?.initial?.duration || "",
            format: gig.training?.initial?.format || "",
            topics: gig.training?.initial?.topics || []
          },
          ongoing: {
            frequency: gig.training?.ongoing?.frequency || "",
            format: gig.training?.ongoing?.format || "",
            topics: gig.training?.ongoing?.topics || []
          },
          support: gig.training?.support || []
        },
        metrics: {
          kpis: gig.metrics?.kpis || [],
          targets: gig.metrics?.targets || {},
          reporting: {
            frequency: gig.metrics?.reporting?.frequency || "",
            metrics: gig.metrics?.reporting?.metrics || []
          }
        },
        compliance: {
          requirements: gig.compliance?.requirements || [],
          certifications: gig.compliance?.certifications || [],
          policies: gig.compliance?.policies || []
        },
        equipment: {
          required: gig.equipment?.required || [],
          provided: gig.equipment?.provided || []
        }
      };

      await saveGigData(gigData);

      const result = await Swal.fire({
        title: "Success!",
        text: "Gig has been created successfully",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "OK",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ff4d4d",
        cancelButtonColor: "#6b7280",
      });

      if (result.isConfirmed) {
        onConfirm();
      }
    } catch (error) {
      console.error("Error saving gig:", error);
      const result = await Swal.fire({
        title: "Error!",
        text: error instanceof Error ? error.message : "Failed to save gig",
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "Try Again",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
      });

      if (result.isConfirmed) {
        handleConfirm(); // Retry saving
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full h-full">
      <h2 className="text-2xl font-bold mb-4">Confirm Gig Details</h2>

      <div className="space-y-4">
        <div className="flex items-start">
          <CheckCircle className="h-6 w-6 text-harx-500 mr-2 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">{gig.title}</h3>
            <p className="text-gray-600">{gig.description}</p>
          </div>
        </div>

        <div className="flex items-start">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Please Review</h3>
            <p className="text-gray-600">
              Please review all the details above. Once confirmed, the gig will be created and published.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-harx-500 text-white rounded-md hover:bg-harx-600"
        >
          Confirm & Create
        </button>
      </div>
    </div>
  );
};
