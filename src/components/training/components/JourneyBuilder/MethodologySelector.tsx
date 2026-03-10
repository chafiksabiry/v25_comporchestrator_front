import React, { useState, useEffect } from 'react';
import {
  Building2,
  Heart,
  Car,
  Home,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Award,
  Target,
  Sparkles,
  Brain,
  BookOpen,
  Zap
} from 'lucide-react';
import { TrainingMethodology } from '../../types/methodology';
import { healthInsuranceMethodology } from '../../data/healthInsuranceMethodology';

interface MethodologySelectorProps {
  onMethodologySelect: (methodology: TrainingMethodology) => void;
  onCustomMethodology: () => void;
  onBack?: () => void;
}

export default function MethodologySelector({ onMethodologySelect, onCustomMethodology, onBack }: MethodologySelectorProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const industries = [
    {
      id: 'health-insurance',
      name: 'Health Insurance Brokerage',
      icon: Heart,
      description: 'Comprehensive training for health insurance brokers covering regulatory compliance, product knowledge, and sales excellence',
      methodology: healthInsuranceMethodology,
      features: [
        'ACA & State Regulation Compliance',
        'Product Mastery (Individual, Group, Medicare)',
        'Sales Process Excellence',
        'Customer Service & Retention',
        'Technology Platform Training',
        'EU GDPR & IDD Compliance',
        'Contact Centre Operations',
        'Multi-Regional Support'
      ],
      duration: '120+ hours',
      certificationLevels: 3,
      color: 'from-red-50 to-pink-50 border-red-200'
    },
    {
      id: 'auto-insurance',
      name: 'Auto Insurance Sales',
      icon: Car,
      description: 'Complete auto insurance sales training with state regulations and product expertise',
      methodology: null, // Would be implemented
      features: [
        'State Insurance Regulations',
        'Auto Insurance Products',
        'Claims Process & Customer Service',
        'Sales Techniques & Objection Handling',
        'Technology Systems Training',
        'Contact Centre Quality Standards'
      ],
      duration: '80+ hours',
      certificationLevels: 3,
      color: 'from-blue-50 to-cyan-50 border-blue-200'
    },
    {
      id: 'property-insurance',
      name: 'Property Insurance',
      icon: Home,
      description: 'Property and casualty insurance training with risk assessment and underwriting',
      methodology: null,
      features: [
        'Property Risk Assessment',
        'Underwriting Guidelines',
        'Claims Management',
        'Customer Consultation',
        'Regulatory Compliance',
        'Contact Centre Operations'
      ],
      duration: '90+ hours',
      certificationLevels: 3,
      color: 'from-green-50 to-emerald-50 border-green-200'
    },
    {
      id: 'life-insurance',
      name: 'Life Insurance Sales',
      icon: Shield,
      description: 'Life insurance and financial planning with estate planning and investment knowledge',
      methodology: null,
      features: [
        'Life Insurance Products',
        'Financial Planning Basics',
        'Estate Planning Concepts',
        'Investment Products',
        'Ethical Sales Practices',
        'Contact Centre Excellence'
      ],
      duration: '100+ hours',
      certificationLevels: 4,
      color: 'from-purple-50 to-indigo-50 border-purple-200'
    },
    {
      id: 'financial-services',
      name: 'Financial Services',
      icon: TrendingUp,
      description: 'Comprehensive financial services training including investments, banking, and advisory services',
      methodology: null,
      features: [
        'Investment Products & Strategies',
        'Banking Services & Regulations',
        'Financial Advisory Skills',
        'Risk Management',
        'Compliance & Ethics',
        'Multi-Channel Customer Service'
      ],
      duration: '150+ hours',
      certificationLevels: 4,
      color: 'from-yellow-50 to-orange-50 border-yellow-200'
    },
    {
      id: 'healthcare',
      name: 'Healthcare Services',
      icon: Stethoscope,
      description: 'Healthcare industry training covering patient care, regulations, and service excellence',
      methodology: null,
      features: [
        'Patient Care Standards',
        'Healthcare Regulations',
        'Medical Terminology',
        'Service Excellence',
        'Technology Systems',
        'Patient Communication Standards'
      ],
      duration: '110+ hours',
      certificationLevels: 3,
      color: 'from-teal-50 to-cyan-50 border-teal-200'
    }
  ];

  const handleIndustrySelect = (industry: any) => {
    if (industry.methodology) {
      onMethodologySelect(industry.methodology);
    } else {
      setSelectedIndustry(industry.id);
      // For now, show that it's coming soon
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="bg-white">
      <div className="container mx-auto px-2 py-2">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-3">
            {onBack && (
              <button
                onClick={onBack}
                className="mb-2 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            )}
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 flex justify-center items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-500" />
                Choose Your Industry Training Methodology
              </h1>
              <p className="text-xs text-gray-600 max-w-3xl mx-auto">
                Select from our comprehensive, industry-specific training methodologies covering all aspects of development.
              </p>
            </div>
          </div>

          {/* Methodology Features */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 text-center">
              Our 360° Methodology Includes
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <BookOpen className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Foundational Knowledge</h3>
              </div>

              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <Shield className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Regulatory Compliance</h3>
              </div>

              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <Building2 className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Industry Expertise</h3>
              </div>

              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <Zap className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Operational Excellence</h3>
              </div>

              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <Users className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Company Integration</h3>
              </div>

              <div className="text-center p-1.5 bg-white rounded border border-gray-100 flex flex-col items-center justify-center">
                <Target className="h-4 w-4 text-indigo-500 mb-1" />
                <h3 className="text-[10px] font-medium text-gray-800 leading-tight">Professional Development</h3>
              </div>
            </div>
          </div>

          {/* Industry Selection */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 text-center mb-2">
              Select Your Industry
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {industries.map((industry) => {
                const Icon = industry.icon;
                const isAvailable = industry.methodology !== null;

                return (
                  <div
                    key={industry.id}
                    className={`bg-white border border-gray-200 rounded-lg p-3 transition-all duration-300 hover:shadow-sm hover:border-indigo-200 ${isAvailable ? 'cursor-pointer' : 'opacity-75'
                      }`}
                    onClick={() => isAvailable && handleIndustrySelect(industry)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-sm font-bold text-gray-900">{industry.name}</h3>
                      </div>
                      {isAvailable ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{industry.description}</p>

                    <div className="bg-slate-50 rounded p-1.5 mb-2">
                      <p className="text-[9px] text-gray-600 truncate">
                        <span className="font-semibold text-gray-800">Includes:</span> {industry.features.join(', ')}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] mb-2 px-1">
                      <div>
                        <span className="text-gray-400">Duration: </span>
                        <span className="font-medium text-gray-800">{industry.duration}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Cert: </span>
                        <span className="font-medium text-gray-800">{industry.certificationLevels} Lvl</span>
                      </div>
                    </div>

                    <button
                      disabled={!isAvailable}
                      className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${isAvailable
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {isAvailable ? 'Select Methodology' : 'Coming Soon'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Methodology Option */}
          <div className="bg-slate-50 rounded-lg border border-dashed border-gray-300 p-2 text-center mt-3 flex justify-between items-center px-4">
            <div className="flex items-center text-left">
              <Sparkles className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Don't See Your Industry?</h3>
                <p className="text-[10px] text-gray-500">Create a custom training methodology tailored to your specific requirements.</p>
              </div>
            </div>

            <button
              onClick={onCustomMethodology}
              className="flex flex-shrink-0 items-center space-x-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 transition-all font-medium text-xs shadow-sm"
            >
              <Brain className="h-3 w-3" />
              <span>Build Custom</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
