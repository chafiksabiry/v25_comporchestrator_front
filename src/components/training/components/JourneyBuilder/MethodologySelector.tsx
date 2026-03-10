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
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-2 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4">
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
              <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 mb-3">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">360° Training Methodology</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Choose Your Industry Training Methodology
              </h1>
              <p className="text-base text-gray-600 max-w-4xl mx-auto">
                Select from our comprehensive, industry-specific training methodologies that cover all aspects
                of professional development from foundational knowledge to expert-level competency.
              </p>
            </div>
          </div>

          {/* Methodology Features */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Our 360° Methodology Includes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Foundational Knowledge</h3>
                <p className="text-blue-700 text-xs">Core industry principles and fundamental concepts</p>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-200">
                <Shield className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-red-900 mb-1">Regulatory Compliance</h3>
                <p className="text-red-700 text-xs">Federal and state regulations, legal requirements</p>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <Building2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-purple-900 mb-1">Industry Expertise</h3>
                <p className="text-purple-700 text-xs">Specialized knowledge and best practices</p>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-orange-900 mb-1">Operational Excellence</h3>
                <p className="text-orange-700 text-xs">Process mastery and operational efficiency</p>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-green-900 mb-1">Company Integration</h3>
                <p className="text-green-700 text-xs">Company culture, values, and procedures</p>
              </div>

              <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                <Target className="h-8 w-8 text-pink-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-pink-900 mb-1">Professional Development</h3>
                <p className="text-pink-700 text-xs">Soft skills and career advancement</p>
              </div>
            </div>
          </div>

          {/* Industry Selection */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Select Your Industry
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {industries.map((industry) => {
                const Icon = industry.icon;
                const isAvailable = industry.methodology !== null;

                return (
                  <div
                    key={industry.id}
                    className={`bg-gradient-to-br ${industry.color} border rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${isAvailable ? 'cursor-pointer' : 'opacity-75'
                      }`}
                    onClick={() => isAvailable && handleIndustrySelect(industry)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="h-8 w-8 text-gray-700" />
                      {isAvailable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">{industry.name}</h3>
                    <p className="text-xs text-gray-700 mb-3 line-clamp-2">{industry.description}</p>

                    <div className="space-y-2 mb-3">
                      <h4 className="font-semibold text-gray-900 text-xs">Key Components:</h4>
                      <ul className="space-y-1">
                        {industry.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="text-xs text-gray-700 flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                        {industry.features.length > 3 && (
                          <li className="text-[10px] text-gray-600">
                            +{industry.features.length - 3} more components
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <div className="font-semibold text-gray-900">{industry.duration}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Cert Levels:</span>
                        <div className="font-semibold text-gray-900">{industry.certificationLevels}</div>
                      </div>
                    </div>

                    <button
                      disabled={!isAvailable}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all ${isAvailable
                          ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-400 p-4 text-center mt-6">
            <Sparkles className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Don't See Your Industry?
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-2xl mx-auto">
              Create a custom training methodology tailored to your specific industry requirements and company needs.
            </p>
            <button
              onClick={onCustomMethodology}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm shadow-md mx-auto"
            >
              <Brain className="h-4 w-4" />
              <span>Build Custom Methodology</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
