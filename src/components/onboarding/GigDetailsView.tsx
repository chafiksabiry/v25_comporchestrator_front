import React from 'react';
import { ArrowLeft, FileText, Target, Award, DollarSign, Users, MapPin, ClockIcon, Globe, Settings, Phone, Repeat, Star } from 'lucide-react';

interface Gig {
  _id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  commission: {
    base?: string;
    baseAmount?: string;
    bonus?: string;
    bonusAmount?: string | number;
    structure?: string;
    currency?: {
      _id: string;
      code?: string;
      name?: string;
      symbol?: string;
      isActive?: boolean;
      createdAt?: string;
      updatedAt?: string;
      __v?: number;
    };
    transactionCommission?: number | {
      type: string;
      amount: string | number;
    };
    commission_per_call?: number;
    minimumVolume?: {
      amount: string | number;
      period: string;
      unit: string;
    };
    additionalDetails?: string;
  };
  availability: {
    minimumHours: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
      _id: string;
    }>;
    time_zone: {
      countryCode: string;
      countryName: string;
      zoneName: string;
      gmtOffset: number;
    };
    flexibility: string[];
  };
  team: {
    size: string;
    structure: Array<{
      seniority: {
        level: string;
        yearsExperience: string;
      };
      roleId: string;
      count: number;
      _id: string;
    }>;
    territories: Array<{
      name: {
        common: string;
        official: string;
      };
      flags: {
        png: string;
        svg: string;
        alt: string;
      };
      _id: string;
    }>;
  };
  skills: {
    professional: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    technical: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    soft: Array<{
      skill: {
        name: string;
        category: string;
      };
      level: number;
    }>;
    languages: Array<{
      language: {
        name: string;
        nativeName: string;
      };
      proficiency: string;
    }>;
  };
  destination_zone: {
    name: {
      common: string;
      official: string;
    };
    flags: {
      png: string;
      alt: string;
    };
    cca2: string;
  };
}

interface GigDetailsViewProps {
  gig: Gig;
  onBack: () => void;
}

const GigDetailsView: React.FC<GigDetailsViewProps> = ({ gig, onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-tighter text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Gigs
        </button>
      </div>

      {/* Main Card (Matching 1st Image) */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-10 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-black text-harx-400 uppercase tracking-widest">
              {gig.category || 'OUTBOUND SALES'}
            </span>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              {gig.title}
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Job Description */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Job Description</h2>
            <p className="text-gray-600 leading-relaxed font-medium text-lg">
              {gig.description || 'Nous recherchons une équipe commerciale dynamique comprenant jusqu\'à 5 télévendeurs pour assurer l\'intégralité du cycle de vente de produits d\'assurance complémentaire santé/mutuelle à destination de clients particuliers en France. Votre mission couvrira toutes les étapes du processus de vente.'}
            </p>
            {/* Seniority Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                {gig.seniority?.level || 'Mid-Level'}
              </span>
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                {gig.seniority?.yearsExperience || '2'} Years Experience
              </span>
            </div>
          </div>

          {/* Right Column: Commission & Details */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Commission & details</h2>
            
            <div className="space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Phone size={14} />
                  {gig.commission?.commission_per_call || '2.8'}€ / APPEL
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Repeat size={14} />
                  {typeof gig.commission?.transactionCommission === 'number' 
                    ? gig.commission.transactionCommission 
                    : ((gig.commission?.transactionCommission as any)?.amount || '21')}€ / TRANSACTION
                </div>
              </div>

              {/* Bonus Badge */}
              <div className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-lg text-sm font-black uppercase tracking-tight inline-flex items-center gap-2">
                <Star size={14} />
                +{gig.commission?.bonusAmount || '84'}€ BONUS
                <span className="text-xs font-medium opacity-80 normal-case ml-1">
                  Chaque {gig.commission?.minimumVolume?.amount || '25'} appels / {gig.commission?.minimumVolume?.period || 'mois'}
                </span>
              </div>

              {/* Description Box */}
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-600 text-sm font-medium leading-relaxed italic border border-gray-100">
                {gig.commission?.additionalDetails || "Une transaction est comptabilisée uniquement si le contrat est signé et non rétracté dans les 14 jours. Les résiliations dans les 3 mois suivant la signature entraînent l'annulation et le remboursement de la commission correspondante. La prime de performance est de 100 € pour 25 transactions validées sur un même mois."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Sections (Team, Skills, etc.) moved below in a clean layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team */}
        {gig.team && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-harx-50 rounded-xl">
                <Users className="h-6 w-6 text-harx-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Team Structure</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Team Size</span>
                <span className="font-bold text-gray-900">{gig.team.size} members</span>
              </div>
              {gig.team.territories && gig.team.territories.length > 0 && (
                <div>
                  <span className="text-gray-600 font-medium block mb-2">Territories</span>
                  <div className="flex flex-wrap gap-2">
                    {gig.team.territories.map((territory, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                        {territory.flags?.png && <img src={territory.flags.png} alt={territory.flags.alt || ''} className="w-5 h-3.5 rounded-sm object-cover" />}
                        <span className="text-xs font-bold text-gray-700">{territory.name?.common || territory}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Destination Zone */}
        {gig.destination_zone && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Destination Zone</h2>
            </div>
            <div className="flex items-center gap-4">
              {gig.destination_zone.flags?.png && <img src={gig.destination_zone.flags.png} alt={gig.destination_zone.flags.alt || ''} className="w-16 h-10 rounded-lg border border-gray-100 object-cover" />}
              <div>
                <h3 className="text-lg font-bold text-gray-900">{typeof gig.destination_zone === 'object' ? (gig.destination_zone.name?.common || 'Unknown') : gig.destination_zone}</h3>
                <p className="text-sm text-gray-500">{gig.destination_zone.name?.official || ''}</p>
                <span className="text-xs font-bold text-gray-400">ISO: {gig.destination_zone.cca2 || ''}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      {gig.skills && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-harx-50 rounded-xl">
              <Target className="h-6 w-6 text-harx-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Skills & Requirements</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gig.skills.professional && gig.skills.professional.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Professional</h3>
                {gig.skills.professional.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{item.skill.name}</span>
                    <span className="text-xs font-bold bg-harx-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.technical && gig.skills.technical.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Technical</h3>
                {gig.skills.technical.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{item.skill.name}</span>
                    <span className="text-xs font-bold bg-cyan-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.soft && gig.skills.soft.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Soft</h3>
                {gig.skills.soft.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{item.skill.name}</span>
                    <span className="text-xs font-bold bg-pink-500 text-white px-2 py-0.5 rounded">Lvl {item.level}</span>
                  </div>
                ))}
              </div>
            )}
            {gig.skills.languages && gig.skills.languages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Languages</h3>
                {gig.skills.languages.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.language.name}</p>
                      <p className="text-xs text-gray-400">{item.language.nativeName}</p>
                    </div>
                    <span className="text-xs font-bold bg-harx-500 text-white px-2 py-0.5 rounded">{item.proficiency}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GigDetailsView;
