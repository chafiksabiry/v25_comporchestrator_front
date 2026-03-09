import React, { useState } from 'react';
import { 
  BookOpen, 
  Shield, 
  Building2, 
  Users, 
  Zap, 
  Award, 
  CheckCircle, 
  Clock, 
  Target,
  Brain,
  BarChart3,
  Settings,
  Play,
  Eye,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { TrainingMethodology, MethodologyComponent } from '../../types/methodology';
import { healthInsuranceMethodology } from '../../data/healthInsuranceMethodology';

interface MethodologyBuilderProps {
  onApplyMethodology: (methodology: TrainingMethodology) => void;
  selectedIndustry?: string;
}

export default function MethodologyBuilder({ onApplyMethodology, selectedIndustry }: MethodologyBuilderProps) {
  const [selectedMethodology, setSelectedMethodology] = useState<TrainingMethodology>(healthInsuranceMethodology);
  const [expandedComponents, setExpandedComponents] = useState<string[]>(['foundational-knowledge']);
  const [activeTab, setActiveTab] = useState('overview');

  const toggleComponent = (componentId: string) => {
    setExpandedComponents(prev => 
      prev.includes(componentId) 
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const getCategoryIcon = (category: MethodologyComponent['category']) => {
    switch (category) {
      case 'foundational':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'regulatory':
        return <Shield className="h-5 w-5 text-red-500" />;
      case 'industry-specific':
        return <Building2 className="h-5 w-5 text-purple-500" />;
      case 'operational':
        return <Zap className="h-5 w-5 text-orange-500" />;
      case 'company-specific':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'soft-skills':
        return <Target className="h-5 w-5 text-pink-500" />;
      case 'regional-compliance':
        return <Shield className="h-5 w-5 text-indigo-500" />;
      case 'contact-centre':
        return <Users className="h-5 w-5 text-cyan-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: MethodologyComponent['category']) => {
    switch (category) {
      case 'foundational':
        return 'from-blue-50 to-cyan-50 border-blue-200';
      case 'regulatory':
        return 'from-red-50 to-pink-50 border-red-200';
      case 'industry-specific':
        return 'from-purple-50 to-indigo-50 border-purple-200';
      case 'operational':
        return 'from-orange-50 to-amber-50 border-orange-200';
      case 'company-specific':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'soft-skills':
        return 'from-pink-50 to-rose-50 border-pink-200';
      case 'regional-compliance':
        return 'from-indigo-50 to-blue-50 border-indigo-200';
      case 'contact-centre':
        return 'from-cyan-50 to-teal-50 border-cyan-200';
      default:
        return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getCompetencyColor = (level: string) => {
    switch (level) {
      case 'awareness':
        return 'bg-gray-100 text-gray-700';
      case 'working':
        return 'bg-blue-100 text-blue-700';
      case 'proficient':
        return 'bg-green-100 text-green-700';
      case 'expert':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Methodology Overview', icon: Eye },
    { id: 'components', label: 'Training Components', icon: BookOpen },
    { id: 'framework', label: 'Learning Framework', icon: Brain },
    { id: 'assessment', label: 'Assessment Strategy', icon: Award },
    { id: 'certification', label: 'Certification Path', icon: Target }
  ];

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Methodology Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-4">{selectedMethodology.name}</h2>
        <p className="text-blue-100 text-lg mb-6">{selectedMethodology.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">{selectedMethodology.components.length}</div>
            <div className="text-blue-200 text-sm">Training Components</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">
              {selectedMethodology.components.reduce((sum, c) => sum + c.estimatedDuration, 0)}h
            </div>
            <div className="text-blue-200 text-sm">Total Duration</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">
              {selectedMethodology.certificationPath.levels.length}
            </div>
            <div className="text-blue-200 text-sm">Certification Levels</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">360°</div>
            <div className="text-blue-200 text-sm">Comprehensive Approach</div>
          </div>
        </div>
      </div>

      {/* Component Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedMethodology.components.map((component) => (
          <div key={component.id} className={`bg-gradient-to-br ${getCategoryColor(component.category)} border-2 rounded-xl p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              {getCategoryIcon(component.category)}
              <h3 className="font-semibold text-gray-900">{component.title}</h3>
              {component.contactCentreSpecific && (
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded-full">
                  Contact Centre
                </span>
              )}
            </div>
            <p className="text-gray-700 text-sm mb-4">{component.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Duration:</span>
                <div className="font-medium">{component.estimatedDuration}h</div>
              </div>
              <div>
                <span className="text-gray-600">Weight:</span>
                <div className="font-medium">{component.weight}%</div>
              </div>
              <div>
                <span className="text-gray-600">Modules:</span>
                <div className="font-medium">{component.modules.length}</div>
              </div>
              <div>
                <span className="text-gray-600">Level:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompetencyColor(component.competencyLevel)}`}>
                  {component.competencyLevel}
                </span>
              </div>
            </div>
            
            {component.regionalVariations && component.regionalVariations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Regional Variations:</div>
                <div className="flex flex-wrap gap-1">
                  {component.regionalVariations.map((variation, index) => (
                    <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                      {variation.region}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Learning Framework Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Learning Framework</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Delivery Methods</h4>
            <div className="space-y-3">
              {selectedMethodology.learningFramework.deliveryMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{method.type.replace('-', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${method.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{method.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Learning Objectives (Bloom's Taxonomy)</h4>
            <div className="space-y-2">
              {selectedMethodology.learningFramework.learningObjectives.map((objective, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    objective.level === 'create' ? 'bg-purple-500' :
                    objective.level === 'evaluate' ? 'bg-red-500' :
                    objective.level === 'analyze' ? 'bg-orange-500' :
                    objective.level === 'apply' ? 'bg-yellow-500' :
                    objective.level === 'understand' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                  <span className="text-sm text-gray-700 capitalize">{objective.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderComponentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-gray-900">Training Components</h3>
        <div className="text-sm text-gray-600">
          {selectedMethodology.components.length} components • {selectedMethodology.components.reduce((sum, c) => sum + c.estimatedDuration, 0)} hours total
        </div>
      </div>

      <div className="space-y-4">
        {selectedMethodology.components.map((component) => (
          <div key={component.id} className={`bg-gradient-to-r ${getCategoryColor(component.category)} border-2 rounded-xl overflow-hidden`}>
            <div 
              className="p-6 cursor-pointer"
              onClick={() => toggleComponent(component.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getCategoryIcon(component.category)}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{component.title}</h4>
                    <p className="text-gray-700">{component.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{component.weight}%</div>
                    <div className="text-sm text-gray-600">Training Weight</div>
                  </div>
                  {expandedComponents.includes(component.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>

            {expandedComponents.includes(component.id) && (
              <div className="px-6 pb-6 bg-white bg-opacity-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-blue-600">{component.estimatedDuration}h</div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-green-600">{component.modules.length}</div>
                    <div className="text-sm text-gray-600">Modules</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-purple-600 capitalize">{component.competencyLevel}</div>
                    <div className="text-sm text-gray-600">Target Level</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3">Training Modules:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {component.modules.map((module, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-gray-800 text-sm">{module}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {component.prerequisites.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Prerequisites:</h5>
                      <div className="flex flex-wrap gap-2">
                        {component.prerequisites.map((prereq, index) => (
                          <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {component.mandatoryForCertification && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          Mandatory for Certification
                        </span>
                      )}
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCompetencyColor(component.competencyLevel)}`}>
                        {component.competencyLevel} Level
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderFrameworkTab = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Learning Framework: {selectedMethodology.learningFramework.approach}</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Delivery Method Distribution</h4>
            <div className="space-y-4">
              {selectedMethodology.learningFramework.deliveryMethods.map((method, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 capitalize">{method.type.replace('-', ' ')}</span>
                    <span className="text-sm font-bold text-gray-900">{method.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                      style={{ width: `${method.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{method.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Reinforcement Strategy</h4>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Spaced Repetition</h5>
                <p className="text-blue-700 text-sm mb-2">
                  {selectedMethodology.learningFramework.reinforcementStrategy.spacedRepetition ? 'Enabled' : 'Disabled'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedMethodology.learningFramework.reinforcementStrategy.practiceIntervals.map((interval, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Day {interval}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Performance Support</h5>
                <ul className="space-y-1">
                  {selectedMethodology.learningFramework.reinforcementStrategy.performanceSupport.map((support, index) => (
                    <li key={index} className="text-green-700 text-sm flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>{support}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Learning Objectives (Bloom's Taxonomy)</h4>
        <div className="space-y-4">
          {selectedMethodology.learningFramework.learningObjectives.map((objective, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-gray-900 capitalize">{objective.level}</h5>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  objective.level === 'create' ? 'bg-purple-100 text-purple-700' :
                  objective.level === 'evaluate' ? 'bg-red-100 text-red-700' :
                  objective.level === 'analyze' ? 'bg-orange-100 text-orange-700' :
                  objective.level === 'apply' ? 'bg-yellow-100 text-yellow-700' :
                  objective.level === 'understand' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  Level {index + 1}
                </span>
              </div>
              <p className="text-gray-700 mb-2">{objective.description}</p>
              <p className="text-sm text-gray-600 mb-3"><strong>Outcome:</strong> {objective.measurableOutcome}</p>
              <div className="flex flex-wrap gap-2">
                {objective.assessmentMethod.map((method, methodIndex) => (
                  <span key={methodIndex} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {method.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAssessmentTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formative Assessments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Formative Assessments</h4>
          <div className="space-y-4">
            {selectedMethodology.assessmentStrategy.formative.map((assessment, index) => (
              <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2 capitalize">{assessment.type.replace('-', ' ')}</h5>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><strong>Frequency:</strong> {assessment.frequency}</div>
                  <div><strong>Feedback:</strong> {assessment.feedback}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summative Assessments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Summative Assessments</h4>
          <div className="space-y-4">
            {selectedMethodology.assessmentStrategy.summative.map((assessment, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2 capitalize">{assessment.type.replace('-', ' ')}</h5>
                <div className="text-sm text-green-700 space-y-1">
                  <div><strong>Passing Criteria:</strong> {assessment.passingCriteria}</div>
                  <div><strong>Retake Policy:</strong> {assessment.retakePolicy}</div>
                  <div><strong>Certification Weight:</strong> {assessment.certificationWeight}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competency Mapping */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Competency Mapping</h4>
        {selectedMethodology.assessmentStrategy.competencyMapping.map((competency, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6 mb-4">
            <h5 className="text-lg font-semibold text-gray-900 mb-4">{competency.competency}</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h6 className="font-medium text-gray-900 mb-2">Behavioral Indicators:</h6>
                <ul className="space-y-1">
                  {competency.behavioralIndicators.map((indicator, indicatorIndex) => (
                    <li key={indicatorIndex} className="text-sm text-gray-700 flex items-start space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h6 className="font-medium text-gray-900 mb-2">Proficiency Levels:</h6>
                <div className="space-y-2">
                  {competency.proficiencyLevels.map((level, levelIndex) => (
                    <div key={levelIndex} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{level.name}</span>
                        <span className="text-sm text-gray-600">Level {level.level}</span>
                      </div>
                      <p className="text-sm text-gray-700">{level.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCertificationTab = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Certification Pathway</h3>
        
        <div className="space-y-6">
          {selectedMethodology.certificationPath.levels.map((level, index) => (
            <div key={level.id} className="relative">
              {index < selectedMethodology.certificationPath.levels.length - 1 && (
                <div className="absolute left-8 top-16 w-0.5 h-16 bg-gradient-to-b from-blue-500 to-purple-500"></div>
              )}
              
              <div className="flex items-start space-x-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {index + 1}
                </div>
                
                <div className="flex-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{level.name}</h4>
                      <p className="text-gray-700">{level.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Minimum Score</div>
                      <div className="text-2xl font-bold text-gray-900">{level.minimumScore}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Required Components:</h5>
                      <ul className="space-y-1">
                        {level.requiredComponents.map((component, compIndex) => (
                          <li key={compIndex} className="text-sm text-gray-700 flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="capitalize">{component.replace('-', ' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Practical Requirements:</h5>
                      <ul className="space-y-1">
                        {level.practicalRequirements.map((requirement, reqIndex) => (
                          <li key={reqIndex} className="text-sm text-gray-700 flex items-start space-x-2">
                            <Target className="h-3 w-3 text-purple-500 mt-1 flex-shrink-0" />
                            <span>{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Timeframe: {level.timeframe}</span>
                      <Award className="h-5 w-5 text-yellow-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Requirements */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Certification Maintenance</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {selectedMethodology.certificationPath.maintenanceRequirements.map((requirement, index) => (
            <div key={index} className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
              <h5 className="font-semibold text-yellow-900 mb-2 capitalize">{requirement.type.replace('-', ' ')}</h5>
              <div className="space-y-2 text-sm text-yellow-800">
                <div><strong>Frequency:</strong> {requirement.frequency}</div>
                <div><strong>Hours Required:</strong> {requirement.hours}</div>
                <div className="text-yellow-700">{requirement.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200 mb-6">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">360° Training Methodology</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Training Methodology
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Industry-leading 360-degree approach covering foundational knowledge, regulatory compliance, 
              industry expertise, operational excellence, and company-specific requirements.
            </p>
          </div>

          {/* Industry Showcase */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Featured: Health Insurance Brokerage</h2>
                <p className="text-purple-100 text-lg">
                  Complete methodology covering regulatory compliance, product mastery, sales excellence, and customer service
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold mb-1">100+</div>
                <div className="text-purple-200 text-sm">Training Hours</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl border border-gray-200 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'components' && renderComponentsTab()}
              {activeTab === 'framework' && renderFrameworkTab()}
              {activeTab === 'assessment' && renderAssessmentTab()}
              {activeTab === 'certification' && renderCertificationTab()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={() => onApplyMethodology(selectedMethodology)}
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              <Sparkles className="h-6 w-6" />
              <span>Apply This Methodology</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <button className="flex items-center space-x-3 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg">
              <Eye className="h-6 w-6" />
              <span>Preview Training Journey</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}