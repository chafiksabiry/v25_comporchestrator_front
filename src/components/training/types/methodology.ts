// Training Methodology Types
export interface TrainingMethodology {
  id: string;
  name: string;
  description: string;
  industry: string;
  region?: 'global' | 'eu' | 'us' | 'uk' | 'apac' | 'latam';
  components: MethodologyComponent[];
  learningFramework: LearningFramework;
  assessmentStrategy: AssessmentStrategy;
  certificationPath: CertificationPath;
  regionalCompliance?: RegionalCompliance[];
  contactCentreRequirements?: ContactCentreRequirements;
}

export interface MethodologyComponent {
  id: string;
  category: 'foundational' | 'industry-specific' | 'regulatory' | 'operational' | 'company-specific' | 'soft-skills' | 'regional-compliance' | 'contact-centre';
  title: string;
  description: string;
  modules: string[];
  weight: number; // Importance percentage in overall training
  prerequisites: string[];
  estimatedDuration: number; // in hours
  competencyLevel: 'awareness' | 'working' | 'proficient' | 'expert';
  mandatoryForCertification: boolean;
  regionalVariations?: RegionalVariation[];
  contactCentreSpecific?: boolean;
}

export interface LearningFramework {
  approach: 'bloom-taxonomy' | 'kirkpatrick' | 'addie' | 'sam' | 'agile-learning';
  learningObjectives: LearningObjective[];
  deliveryMethods: DeliveryMethod[];
  reinforcementStrategy: ReinforcementStrategy;
}

export interface LearningObjective {
  id: string;
  level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'; // Bloom's Taxonomy
  description: string;
  measurableOutcome: string;
  assessmentMethod: string[];
}

export interface DeliveryMethod {
  type: 'microlearning' | 'scenario-based' | 'simulation' | 'peer-learning' | 'mentoring' | 'self-paced' | 'instructor-led';
  percentage: number;
  rationale: string;
}

export interface ReinforcementStrategy {
  spacedRepetition: boolean;
  practiceIntervals: number[]; // Days after initial learning
  refresherContent: string[];
  performanceSupport: string[];
}

export interface AssessmentStrategy {
  formative: FormativeAssessment[];
  summative: SummativeAssessment[];
  competencyMapping: CompetencyMapping[];
  continuousImprovement: boolean;
}

export interface FormativeAssessment {
  type: 'knowledge-check' | 'scenario-practice' | 'peer-review' | 'self-reflection';
  frequency: 'per-module' | 'weekly' | 'milestone-based';
  feedback: 'immediate' | 'delayed' | 'peer-based';
}

export interface SummativeAssessment {
  type: 'comprehensive-exam' | 'practical-demonstration' | 'portfolio' | 'capstone-project';
  passingCriteria: string;
  retakePolicy: string;
  certificationWeight: number;
}

export interface CompetencyMapping {
  competency: string;
  behavioralIndicators: string[];
  assessmentMethods: string[];
  proficiencyLevels: ProficiencyLevel[];
}

export interface ProficiencyLevel {
  level: number;
  name: string;
  description: string;
  criteria: string[];
}

export interface CertificationPath {
  levels: CertificationLevel[];
  maintenanceRequirements: MaintenanceRequirement[];
  advancementCriteria: AdvancementCriteria[];
}

export interface CertificationLevel {
  id: string;
  name: string;
  description: string;
  requiredComponents: string[];
  minimumScore: number;
  practicalRequirements: string[];
  timeframe: string;
  badge: string;
}

export interface MaintenanceRequirement {
  type: 'continuing-education' | 'refresher-training' | 'performance-review';
  frequency: string;
  hours: number;
  description: string;
}

export interface AdvancementCriteria {
  fromLevel: string;
  toLevel: string;
  requirements: string[];
  timeInRole: number; // months
  performanceMetrics: string[];
}

// Health Insurance Specific Types
export interface HealthInsuranceSpecialization {
  regulatoryKnowledge: RegulatoryComponent[];
  productKnowledge: ProductComponent[];
  salesProcess: SalesComponent[];
  customerService: CustomerServiceComponent[];
  compliance: ComplianceComponent[];
  technology: TechnologyComponent[];
}

export interface RegulatoryComponent {
  regulation: string;
  description: string;
  applicableStates: string[];
  updateFrequency: string;
  penaltyForNonCompliance: string;
  trainingModules: string[];
}

export interface ProductComponent {
  category: 'individual' | 'group' | 'medicare' | 'medicaid' | 'short-term' | 'supplemental';
  products: HealthInsuranceProduct[];
  competencyRequirements: string[];
}

export interface HealthInsuranceProduct {
  name: string;
  type: string;
  keyFeatures: string[];
  targetMarket: string;
  competitiveAdvantages: string[];
  commonObjections: string[];
  salesPoints: string[];
}

export interface SalesComponent {
  stage: 'prospecting' | 'needs-analysis' | 'presentation' | 'objection-handling' | 'closing' | 'follow-up';
  skills: string[];
  tools: string[];
  metrics: string[];
  bestPractices: string[];
}

export interface CustomerServiceComponent {
  scenario: string;
  skills: string[];
  regulations: string[];
  escalationProcedures: string[];
  documentationRequirements: string[];
}

export interface ComplianceComponent {
  area: string;
  requirements: string[];
  documentation: string[];
  auditPreparation: string[];
  violationConsequences: string[];
}

export interface TechnologyComponent {
  system: string;
  functionality: string[];
  integrations: string[];
  troubleshooting: string[];
  securityRequirements: string[];
}

// Regional Compliance Types
export interface RegionalCompliance {
  region: 'eu' | 'us' | 'uk' | 'apac' | 'latam';
  regulations: RegionalRegulation[];
  dataProtection: DataProtectionRequirement[];
  consumerRights: ConsumerRightsRequirement[];
  languageRequirements: LanguageRequirement[];
}

export interface RegionalRegulation {
  name: string;
  description: string;
  applicableCountries: string[];
  complianceRequirements: string[];
  penalties: string[];
  trainingModules: string[];
  updateFrequency: string;
}

export interface DataProtectionRequirement {
  regulation: string; // e.g., 'GDPR', 'CCPA', 'PIPEDA'
  scope: string;
  keyRequirements: string[];
  consentManagement: string[];
  dataSubjectRights: string[];
  breachNotification: string[];
}

export interface ConsumerRightsRequirement {
  right: string;
  description: string;
  implementation: string[];
  documentation: string[];
  timeframes: string[];
}

export interface LanguageRequirement {
  language: string;
  mandatory: boolean;
  context: string[];
  proficiencyLevel: 'basic' | 'conversational' | 'business' | 'native';
}

export interface RegionalVariation {
  region: string;
  modifications: string[];
  additionalRequirements: string[];
  exemptions: string[];
}

// Contact Centre Specific Types
export interface ContactCentreRequirements {
  operationalStandards: OperationalStandard[];
  qualityAssurance: QualityAssuranceFramework;
  customerExperience: CustomerExperienceStandards;
  technologySystems: ContactCentreTechnology[];
  performanceMetrics: PerformanceMetric[];
  escalationProcedures: EscalationProcedure[];
  complianceMonitoring: ComplianceMonitoring;
}

export interface OperationalStandard {
  category: 'call-handling' | 'response-time' | 'availability' | 'documentation' | 'follow-up';
  standard: string;
  measurement: string;
  target: string;
  consequences: string[];
  trainingRequirements: string[];
}

export interface QualityAssuranceFramework {
  monitoringFrequency: string;
  evaluationCriteria: EvaluationCriteria[];
  scoringSystem: ScoringSystem;
  improvementProcess: ImprovementProcess;
  calibrationRequirements: CalibrationRequirement[];
}

export interface EvaluationCriteria {
  category: string;
  weight: number;
  criteria: string[];
  scoringRubric: ScoringRubric[];
}

export interface ScoringRubric {
  score: number;
  description: string;
  examples: string[];
}

export interface ScoringSystem {
  scale: string; // e.g., '1-5', '1-10', 'percentage'
  passingScore: number;
  excellenceThreshold: number;
  weightedCategories: boolean;
}

export interface ImprovementProcess {
  coachingTriggers: string[];
  developmentPlans: string[];
  followUpSchedule: string[];
  escalationCriteria: string[];
}

export interface CalibrationRequirement {
  frequency: string;
  participants: string[];
  process: string[];
  documentation: string[];
}

export interface CustomerExperienceStandards {
  serviceLevel: ServiceLevelAgreement[];
  customerSatisfaction: CustomerSatisfactionMetric[];
  communicationStandards: CommunicationStandard[];
  resolutionStandards: ResolutionStandard[];
}

export interface ServiceLevelAgreement {
  metric: string;
  target: string;
  measurement: string;
  reportingFrequency: string;
}

export interface CustomerSatisfactionMetric {
  type: 'csat' | 'nps' | 'ces' | 'fcr';
  target: number;
  surveyMethod: string;
  frequency: string;
}

export interface CommunicationStandard {
  channel: 'phone' | 'email' | 'chat' | 'video' | 'social';
  responseTime: string;
  qualityStandards: string[];
  escalationCriteria: string[];
}

export interface ResolutionStandard {
  category: string;
  targetResolutionTime: string;
  escalationTriggers: string[];
  documentationRequirements: string[];
}

export interface ContactCentreTechnology {
  system: string;
  purpose: string;
  trainingRequirements: string[];
  certificationNeeded: boolean;
  updateFrequency: string;
  integrations: string[];
}

export interface PerformanceMetric {
  name: string;
  description: string;
  target: string;
  measurement: string;
  frequency: string;
  consequences: PerformanceConsequence[];
}

export interface PerformanceConsequence {
  condition: string;
  action: string;
  timeline: string;
}

export interface EscalationProcedure {
  trigger: string;
  level: number;
  escalationTo: string;
  timeframe: string;
  documentation: string[];
  followUp: string[];
}

export interface ComplianceMonitoring {
  callRecording: CallRecordingRequirement;
  dataHandling: DataHandlingRequirement[];
  auditRequirements: AuditRequirement[];
  reportingObligations: ReportingObligation[];
}

export interface CallRecordingRequirement {
  mandatory: boolean;
  retentionPeriod: string;
  accessControls: string[];
  consentRequirements: string[];
  qualityReview: string[];
}

export interface DataHandlingRequirement {
  dataType: string;
  handlingProcedures: string[];
  accessRestrictions: string[];
  retentionPeriod: string;
  disposalRequirements: string[];
}

export interface AuditRequirement {
  type: string;
  frequency: string;
  scope: string[];
  documentation: string[];
  remediation: string[];
}

export interface ReportingObligation {
  report: string;
  frequency: string;
  recipients: string[];
  deadline: string;
  consequences: string[];
}