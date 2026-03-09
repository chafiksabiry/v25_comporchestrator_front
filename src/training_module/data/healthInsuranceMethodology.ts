import { TrainingMethodology, HealthInsuranceSpecialization } from '../types/methodology';

export const healthInsuranceMethodology: TrainingMethodology = {
  id: 'health-insurance-brokerage',
  name: 'Health Insurance Brokerage Mastery Program',
  description: 'Comprehensive 360-degree training methodology for health insurance brokers covering regulatory compliance, product knowledge, sales excellence, and customer service mastery.',
  industry: 'Health Insurance Brokerage',
  region: 'us',
  components: [
    {
      id: 'foundational-knowledge',
      category: 'foundational',
      title: 'Insurance Fundamentals & Industry Overview',
      description: 'Core insurance principles, industry structure, and market dynamics',
      modules: [
        'Insurance Principles and Risk Management',
        'Health Insurance Market Overview',
        'Key Industry Players and Ecosystem',
        'Insurance vs. Healthcare Financing',
        'Consumer Behavior and Decision Making'
      ],
      weight: 15,
      prerequisites: [],
      estimatedDuration: 12,
      competencyLevel: 'working',
      mandatoryForCertification: true
    },
    {
      id: 'regulatory-compliance',
      category: 'regulatory',
      title: 'Regulatory Compliance & Legal Framework',
      description: 'Federal and state regulations, compliance requirements, and legal obligations',
      modules: [
        'Affordable Care Act (ACA) Comprehensive Overview',
        'State Insurance Regulations and Variations',
        'HIPAA Privacy and Security Requirements',
        'Department of Insurance Licensing Requirements',
        'Fair Marketing Practices and Consumer Protection',
        'Fraud Prevention and Reporting Obligations',
        'Record Keeping and Documentation Standards',
        'Continuing Education Requirements by State'
      ],
      weight: 25,
      prerequisites: ['foundational-knowledge'],
      estimatedDuration: 20,
      competencyLevel: 'proficient',
      mandatoryForCertification: true
    },
    {
      id: 'product-mastery',
      category: 'industry-specific',
      title: 'Health Insurance Product Mastery',
      description: 'Comprehensive understanding of all health insurance products and plan types',
      modules: [
        'Individual and Family Plans Deep Dive',
        'Group Health Insurance Solutions',
        'Medicare Advantage and Supplement Plans',
        'Short-Term Medical Insurance',
        'Health Savings Accounts (HSAs) and FSAs',
        'Dental and Vision Insurance Products',
        'Critical Illness and Hospital Indemnity',
        'Plan Comparison and Recommendation Strategies',
        'Network Types and Provider Relationships',
        'Prescription Drug Coverage Analysis'
      ],
      weight: 30,
      prerequisites: ['foundational-knowledge', 'regulatory-compliance'],
      estimatedDuration: 25,
      competencyLevel: 'expert',
      mandatoryForCertification: true
    },
    {
      id: 'sales-excellence',
      category: 'operational',
      title: 'Sales Process Excellence & Customer Acquisition',
      description: 'Advanced sales methodologies specific to health insurance brokerage',
      modules: [
        'Consultative Selling in Health Insurance',
        'Needs Analysis and Risk Assessment',
        'Presentation Techniques for Complex Products',
        'Objection Handling and Competitive Positioning',
        'Closing Strategies and Enrollment Process',
        'Cross-selling and Upselling Opportunities',
        'Referral Generation and Network Building',
        'Digital Marketing and Lead Generation',
        'CRM Management and Pipeline Optimization'
      ],
      weight: 20,
      prerequisites: ['product-mastery'],
      estimatedDuration: 18,
      competencyLevel: 'proficient',
      mandatoryForCertification: true
    },
    {
      id: 'customer-service-excellence',
      category: 'operational',
      title: 'Customer Service Excellence & Retention',
      description: 'Superior customer service delivery and relationship management',
      modules: [
        'Customer Onboarding and Welcome Process',
        'Claims Assistance and Advocacy',
        'Annual Enrollment Period Management',
        'Life Event Consultation and Plan Changes',
        'Complaint Resolution and Service Recovery',
        'Proactive Account Management',
        'Customer Education and Empowerment',
        'Retention Strategies and Loyalty Building',
        'Multi-channel Communication Excellence'
      ],
      weight: 15,
      prerequisites: ['product-mastery'],
      estimatedDuration: 15,
      competencyLevel: 'proficient',
      mandatoryForCertification: true
    },
    {
      id: 'technology-proficiency',
      category: 'operational',
      title: 'Technology Systems & Digital Tools',
      description: 'Mastery of brokerage technology platforms and digital tools',
      modules: [
        'Brokerage Management System Navigation',
        'Carrier Portal Integration and Usage',
        'Quote and Enrollment Platform Mastery',
        'CRM System Advanced Features',
        'Digital Signature and Document Management',
        'Compliance Tracking and Reporting Tools',
        'Customer Portal Administration',
        'Data Security and Privacy Protection',
        'Mobile App Functionality and Support'
      ],
      weight: 10,
      prerequisites: ['foundational-knowledge'],
      estimatedDuration: 12,
      competencyLevel: 'working',
      mandatoryForCertification: false
    },
    {
      id: 'company-culture',
      category: 'company-specific',
      title: 'Company Culture, Values & Procedures',
      description: 'Company-specific policies, procedures, and cultural integration',
      modules: [
        'Company Mission, Vision, and Values',
        'Organizational Structure and Reporting',
        'Internal Policies and Procedures',
        'Compensation Structure and Incentives',
        'Professional Development Opportunities',
        'Team Collaboration and Communication',
        'Quality Assurance and Performance Standards',
        'Company-Specific Technology and Tools',
        'Escalation Procedures and Support Resources'
      ],
      weight: 8,
      prerequisites: [],
      estimatedDuration: 8,
      competencyLevel: 'working',
      mandatoryForCertification: false
    },
    {
      id: 'professional-development',
      category: 'soft-skills',
      title: 'Professional Development & Soft Skills',
      description: 'Essential soft skills and professional development for career growth',
      modules: [
        'Professional Communication and Presentation',
        'Time Management and Productivity',
        'Emotional Intelligence and Empathy',
        'Stress Management and Resilience',
        'Ethical Decision Making and Integrity',
        'Leadership and Team Collaboration',
        'Continuous Learning and Adaptability',
        'Personal Branding and Networking',
        'Goal Setting and Performance Management'
      ],
      weight: 12,
      prerequisites: [],
      estimatedDuration: 10,
      competencyLevel: 'working',
      mandatoryForCertification: false
    },
    {
      id: 'regional-compliance-eu',
      category: 'regional-compliance',
      title: 'EU Regional Compliance & Data Protection',
      description: 'European Union specific regulations including GDPR, consumer rights, and cross-border insurance requirements',
      modules: [
        'GDPR Compliance for Insurance Brokers',
        'EU Consumer Rights and Protection',
        'Cross-Border Insurance Regulations',
        'EU Data Subject Rights Management',
        'Privacy Impact Assessments',
        'Consent Management and Documentation',
        'Breach Notification Procedures',
        'EU Insurance Distribution Directive (IDD)',
        'Solvency II Customer Impact',
        'Multi-Language Customer Communication'
      ],
      weight: 20,
      prerequisites: ['foundational-knowledge', 'regulatory-compliance'],
      estimatedDuration: 16,
      competencyLevel: 'proficient',
      mandatoryForCertification: true,
      regionalVariations: [
        {
          region: 'Germany',
          modifications: ['German Insurance Contract Act (VVG)', 'BaFin specific requirements'],
          additionalRequirements: ['German language proficiency', 'Local consumer protection laws'],
          exemptions: []
        },
        {
          region: 'France',
          modifications: ['Code des Assurances compliance', 'ACPR regulations'],
          additionalRequirements: ['French language proficiency', 'Local distribution rules'],
          exemptions: []
        }
      ]
    },
    {
      id: 'contact-centre-operations',
      category: 'contact-centre',
      title: 'Contact Centre Excellence & Customer Operations',
      description: 'Specialized training for contact centre operations including call handling, quality assurance, and customer experience management',
      modules: [
        'Professional Call Handling Techniques',
        'Multi-Channel Customer Communication',
        'Call Recording and Compliance',
        'Quality Assurance and Monitoring',
        'Customer Experience Optimization',
        'Escalation Management and Procedures',
        'Performance Metrics and KPIs',
        'Contact Centre Technology Mastery',
        'Workforce Management and Scheduling',
        'Crisis Communication and Business Continuity',
        'Customer Data Security in Contact Centres',
        'Omnichannel Customer Journey Management'
      ],
      weight: 18,
      prerequisites: ['foundational-knowledge', 'customer-service-excellence'],
      estimatedDuration: 14,
      competencyLevel: 'proficient',
      mandatoryForCertification: true,
      contactCentreSpecific: true
    },
    {
      id: 'regional-compliance-us',
      category: 'regional-compliance',
      title: 'US Federal & State Compliance Framework',
      description: 'United States specific federal and state insurance regulations, consumer protection laws, and compliance requirements',
      modules: [
        'State Insurance Commissioner Regulations',
        'NAIC Model Laws and Regulations',
        'Federal Trade Commission (FTC) Requirements',
        'Americans with Disabilities Act (ADA) Compliance',
        'Telephone Consumer Protection Act (TCPA)',
        'Fair Credit Reporting Act (FCRA) for Insurance',
        'State-Specific Licensing Variations',
        'Multi-State Practice Requirements',
        'Consumer Complaint Procedures by State',
        'Continuing Education State Requirements'
      ],
      weight: 22,
      prerequisites: ['foundational-knowledge'],
      estimatedDuration: 18,
      competencyLevel: 'proficient',
      mandatoryForCertification: true,
      regionalVariations: [
        {
          region: 'California',
          modifications: ['California Insurance Code specifics', 'Proposition 103 requirements'],
          additionalRequirements: ['Spanish language capability recommended', 'Earthquake insurance knowledge'],
          exemptions: []
        },
        {
          region: 'New York',
          modifications: ['New York Insurance Law', 'DFS regulations'],
          additionalRequirements: ['Multi-language capability', 'No-fault auto insurance expertise'],
          exemptions: []
        }
      ]
    }
  ],
  learningFramework: {
    approach: 'bloom-taxonomy',
    learningObjectives: [
      {
        id: 'remember-regulations',
        level: 'remember',
        description: 'Recall key health insurance regulations and compliance requirements',
        measurableOutcome: 'Identify 95% of regulatory requirements in scenario-based questions',
        assessmentMethod: ['multiple-choice-quiz', 'flashcard-review']
      },
      {
        id: 'understand-products',
        level: 'understand',
        description: 'Explain health insurance products and their applications',
        measurableOutcome: 'Accurately explain product features and benefits to diverse customer personas',
        assessmentMethod: ['case-study-analysis', 'product-comparison-exercise']
      },
      {
        id: 'apply-sales-process',
        level: 'apply',
        description: 'Execute the complete sales process from prospecting to enrollment',
        measurableOutcome: 'Successfully complete end-to-end sales simulation with 85% accuracy',
        assessmentMethod: ['role-play-simulation', 'practical-demonstration']
      },
      {
        id: 'analyze-customer-needs',
        level: 'analyze',
        description: 'Analyze customer situations to recommend optimal insurance solutions',
        measurableOutcome: 'Provide appropriate recommendations in 90% of complex customer scenarios',
        assessmentMethod: ['case-study-analysis', 'needs-assessment-simulation']
      },
      {
        id: 'evaluate-solutions',
        level: 'evaluate',
        description: 'Evaluate and compare insurance options for optimal customer outcomes',
        measurableOutcome: 'Justify recommendation decisions with clear cost-benefit analysis',
        assessmentMethod: ['comparative-analysis', 'decision-matrix-exercise']
      },
      {
        id: 'create-strategies',
        level: 'create',
        description: 'Develop innovative approaches to customer acquisition and retention',
        measurableOutcome: 'Design and implement personalized customer engagement strategies',
        assessmentMethod: ['strategy-presentation', 'innovation-project']
      }
    ],
    deliveryMethods: [
      {
        type: 'microlearning',
        percentage: 30,
        rationale: 'Bite-sized content for complex regulatory information retention'
      },
      {
        type: 'scenario-based',
        percentage: 25,
        rationale: 'Real-world application of insurance concepts and sales situations'
      },
      {
        type: 'simulation',
        percentage: 20,
        rationale: 'Safe practice environment for high-stakes customer interactions'
      },
      {
        type: 'peer-learning',
        percentage: 10,
        rationale: 'Knowledge sharing and collaborative problem-solving'
      },
      {
        type: 'mentoring',
        percentage: 10,
        rationale: 'Personalized guidance from experienced brokers'
      },
      {
        type: 'self-paced',
        percentage: 5,
        rationale: 'Flexible learning for foundational knowledge building'
      }
    ],
    reinforcementStrategy: {
      spacedRepetition: true,
      practiceIntervals: [1, 3, 7, 14, 30, 90], // Days
      refresherContent: [
        'Regulatory update summaries',
        'Product feature highlights',
        'Sales technique reminders',
        'Compliance checkpoint reviews'
      ],
      performanceSupport: [
        'Quick reference guides',
        'Decision trees for complex situations',
        'Regulatory compliance checklists',
        'Product comparison tools'
      ]
    }
  },
  assessmentStrategy: {
    formative: [
      {
        type: 'knowledge-check',
        frequency: 'per-module',
        feedback: 'immediate'
      },
      {
        type: 'scenario-practice',
        frequency: 'weekly',
        feedback: 'immediate'
      },
      {
        type: 'peer-review',
        frequency: 'milestone-based',
        feedback: 'peer-based'
      }
    ],
    summative: [
      {
        type: 'comprehensive-exam',
        passingCriteria: '85% overall score with no section below 80%',
        retakePolicy: 'Maximum 3 attempts with mandatory remedial training between attempts',
        certificationWeight: 40
      },
      {
        type: 'practical-demonstration',
        passingCriteria: 'Successful completion of 5 customer interaction scenarios',
        retakePolicy: 'Individual scenario retakes allowed',
        certificationWeight: 35
      },
      {
        type: 'portfolio',
        passingCriteria: 'Complete portfolio of customer cases and solutions',
        retakePolicy: 'Portfolio revision and resubmission allowed',
        certificationWeight: 25
      }
    ],
    competencyMapping: [
      {
        competency: 'Regulatory Compliance',
        behavioralIndicators: [
          'Consistently follows all applicable regulations',
          'Maintains current knowledge of regulatory changes',
          'Properly documents all customer interactions',
          'Identifies and reports compliance issues'
        ],
        assessmentMethods: ['regulation-quiz', 'compliance-audit', 'documentation-review'],
        proficiencyLevels: [
          {
            level: 1,
            name: 'Awareness',
            description: 'Basic understanding of key regulations',
            criteria: ['Can identify major regulations', 'Knows where to find compliance information']
          },
          {
            level: 2,
            name: 'Working Knowledge',
            description: 'Can apply regulations in standard situations',
            criteria: ['Follows compliance procedures', 'Recognizes compliance issues']
          },
          {
            level: 3,
            name: 'Proficient',
            description: 'Consistently applies regulations across all situations',
            criteria: ['Proactively ensures compliance', 'Guides others on regulatory matters']
          },
          {
            level: 4,
            name: 'Expert',
            description: 'Deep regulatory expertise and thought leadership',
            criteria: ['Interprets complex regulations', 'Develops compliance strategies']
          }
        ]
      }
    ],
    continuousImprovement: true
  },
  certificationPath: {
    levels: [
      {
        id: 'associate-broker',
        name: 'Associate Health Insurance Broker',
        description: 'Entry-level certification for new health insurance brokers',
        requiredComponents: ['foundational-knowledge', 'regulatory-compliance', 'product-mastery'],
        minimumScore: 80,
        practicalRequirements: [
          'Complete 10 supervised customer interactions',
          'Demonstrate product presentation skills',
          'Pass regulatory compliance assessment'
        ],
        timeframe: '90 days',
        badge: 'associate-broker-badge.png'
      },
      {
        id: 'certified-broker',
        name: 'Certified Health Insurance Broker',
        description: 'Full certification with independent practice authorization',
        requiredComponents: ['foundational-knowledge', 'regulatory-compliance', 'product-mastery', 'sales-excellence', 'customer-service-excellence'],
        minimumScore: 85,
        practicalRequirements: [
          'Complete 25 independent customer interactions',
          'Achieve 90% customer satisfaction rating',
          'Demonstrate advanced objection handling',
          'Complete compliance audit successfully'
        ],
        timeframe: '180 days',
        badge: 'certified-broker-badge.png'
      },
      {
        id: 'senior-broker',
        name: 'Senior Health Insurance Broker',
        description: 'Advanced certification with mentoring and leadership responsibilities',
        requiredComponents: ['all-components'],
        minimumScore: 90,
        practicalRequirements: [
          'Mentor 2 new brokers to certification',
          'Achieve top 25% performance metrics',
          'Lead customer service excellence initiatives',
          'Contribute to training content development'
        ],
        timeframe: '365 days',
        badge: 'senior-broker-badge.png'
      }
    ],
    maintenanceRequirements: [
      {
        type: 'continuing-education',
        frequency: 'annually',
        hours: 24,
        description: 'Annual continuing education to maintain certification and stay current with industry changes'
      },
      {
        type: 'refresher-training',
        frequency: 'quarterly',
        hours: 4,
        description: 'Quarterly refresher on regulatory updates and product changes'
      },
      {
        type: 'performance-review',
        frequency: 'semi-annually',
        hours: 2,
        description: 'Performance review and competency assessment with manager'
      }
    ],
    advancementCriteria: [
      {
        fromLevel: 'associate-broker',
        toLevel: 'certified-broker',
        requirements: [
          'Complete all required training components',
          'Achieve minimum performance metrics',
          'Demonstrate independent customer management',
          'Pass comprehensive certification exam'
        ],
        timeInRole: 6,
        performanceMetrics: [
          'Customer satisfaction score ≥ 4.5/5',
          'Sales conversion rate ≥ 15%',
          'Compliance score = 100%',
          'Product knowledge assessment ≥ 90%'
        ]
      }
    ]
  },
  regionalCompliance: [
    {
      region: 'eu',
      regulations: [
        {
          name: 'General Data Protection Regulation (GDPR)',
          description: 'EU regulation on data protection and privacy for individuals within the European Union',
          applicableCountries: ['All EU member states', 'EEA countries'],
          complianceRequirements: [
            'Lawful basis for processing personal data',
            'Data subject consent management',
            'Right to be forgotten implementation',
            'Data portability procedures',
            'Privacy by design and default',
            'Data Protection Impact Assessments'
          ],
          penalties: ['Up to €20 million or 4% of annual global turnover', 'Administrative fines', 'Processing bans'],
          trainingModules: [
            'GDPR Fundamentals for Insurance',
            'Consent Management Systems',
            'Data Subject Rights Handling',
            'Breach Response Procedures',
            'Privacy Impact Assessment Process'
          ],
          updateFrequency: 'As needed with regulatory guidance'
        },
        {
          name: 'Insurance Distribution Directive (IDD)',
          description: 'EU directive governing the distribution of insurance products',
          applicableCountries: ['All EU member states'],
          complianceRequirements: [
            'Professional competence requirements',
            'Conflicts of interest management',
            'Product oversight and governance',
            'Customer information and advice standards',
            'Remuneration disclosure requirements'
          ],
          penalties: ['License revocation', 'Administrative sanctions', 'Financial penalties'],
          trainingModules: [
            'IDD Professional Requirements',
            'Conflicts of Interest Management',
            'Product Information Standards',
            'Customer Advice and Suitability',
            'Remuneration Transparency'
          ],
          updateFrequency: 'Annual review with regulatory updates'
        }
      ],
      dataProtection: [
        {
          regulation: 'GDPR',
          scope: 'All personal data processing activities',
          keyRequirements: [
            'Explicit consent for data processing',
            'Clear privacy notices and policies',
            'Data minimization principles',
            'Secure data storage and transmission',
            'Regular data protection training'
          ],
          consentManagement: [
            'Granular consent options',
            'Easy consent withdrawal',
            'Consent record keeping',
            'Regular consent refresh'
          ],
          dataSubjectRights: [
            'Right of access to personal data',
            'Right to rectification',
            'Right to erasure (right to be forgotten)',
            'Right to restrict processing',
            'Right to data portability',
            'Right to object to processing'
          ],
          breachNotification: [
            '72-hour notification to supervisory authority',
            'Individual notification without undue delay',
            'Breach register maintenance',
            'Risk assessment procedures'
          ]
        }
      ],
      consumerRights: [
        {
          right: 'Right to Clear Information',
          description: 'Customers must receive clear, understandable information about insurance products',
          implementation: [
            'Plain language product descriptions',
            'Standardized information documents',
            'Multi-language support where required',
            'Accessible format options'
          ],
          documentation: [
            'Product information documents',
            'Terms and conditions',
            'Privacy notices',
            'Complaint procedures'
          ],
          timeframes: ['Information provided before contract conclusion']
        },
        {
          right: 'Cooling-off Period',
          description: 'Customers have the right to cancel insurance contracts within a specified period',
          implementation: [
            '14-day cooling-off period for most products',
            'Clear cancellation procedures',
            'Full premium refund processes',
            'Proactive customer communication'
          ],
          documentation: [
            'Cooling-off period notices',
            'Cancellation request forms',
            'Refund processing records'
          ],
          timeframes: ['14 days from contract conclusion or receipt of contractual terms']
        }
      ],
      languageRequirements: [
        {
          language: 'English',
          mandatory: true,
          context: ['All business communications', 'Documentation', 'Training materials'],
          proficiencyLevel: 'business'
        },
        {
          language: 'German',
          mandatory: false,
          context: ['German market operations', 'Local customer service'],
          proficiencyLevel: 'conversational'
        },
        {
          language: 'French',
          mandatory: false,
          context: ['French market operations', 'Local customer service'],
          proficiencyLevel: 'conversational'
        }
      ]
    },
    {
      region: 'us',
      regulations: [
        {
          name: 'Telephone Consumer Protection Act (TCPA)',
          description: 'Federal law restricting telephone solicitations and use of automated dialing systems',
          applicableCountries: ['United States'],
          complianceRequirements: [
            'Written consent for automated calls/texts',
            'Do Not Call Registry compliance',
            'Opt-out mechanisms in all communications',
            'Call time restrictions (8 AM - 9 PM)',
            'Caller ID accuracy requirements'
          ],
          penalties: ['$500-$1,500 per violation', 'Class action lawsuits', 'FCC enforcement actions'],
          trainingModules: [
            'TCPA Compliance Fundamentals',
            'Consent Management for Calls and Texts',
            'Do Not Call Registry Procedures',
            'Automated Dialing System Compliance',
            'Call Recording and Monitoring Requirements'
          ],
          updateFrequency: 'Quarterly with FCC guidance updates'
        }
      ],
      dataProtection: [
        {
          regulation: 'CCPA',
          scope: 'California residents personal information',
          keyRequirements: [
            'Consumer right to know about data collection',
            'Right to delete personal information',
            'Right to opt-out of sale of personal information',
            'Non-discrimination for exercising privacy rights'
          ],
          consentManagement: [
            'Clear opt-out mechanisms',
            'Verified consumer requests',
            'Business purpose disclosures'
          ],
          dataSubjectRights: [
            'Right to know categories of personal information',
            'Right to know specific pieces of information',
            'Right to delete personal information',
            'Right to opt-out of sale',
            'Right to non-discrimination'
          ],
          breachNotification: [
            'No specific breach notification timeline',
            'General duty to implement reasonable security',
            'Consumer notification for significant breaches'
          ]
        }
      ],
      consumerRights: [
        {
          right: 'Free Look Period',
          description: 'Customers can review and cancel insurance policies within a specified period',
          implementation: [
            '10-30 day free look period (varies by state and product)',
            'Full premium refund if cancelled during free look',
            'Clear notification of free look rights',
            'Simple cancellation procedures'
          ],
          documentation: [
            'Free look period notices',
            'Cancellation forms',
            'Refund processing documentation'
          ],
          timeframes: ['Varies by state: 10-30 days from policy delivery']
        }
      ],
      languageRequirements: [
        {
          language: 'English',
          mandatory: true,
          context: ['All business communications', 'Legal documentation', 'Training'],
          proficiencyLevel: 'business'
        },
        {
          language: 'Spanish',
          mandatory: false,
          context: ['Customer service in Hispanic markets', 'Marketing materials'],
          proficiencyLevel: 'conversational'
        }
      ]
    }
  ],
  contactCentreRequirements: {
    operationalStandards: [
      {
        category: 'call-handling',
        standard: 'Professional call greeting and closure',
        measurement: 'Quality monitoring scores',
        target: '95% compliance on monitored calls',
        consequences: ['Coaching session', 'Additional training', 'Performance improvement plan'],
        trainingRequirements: ['Call handling certification', 'Monthly refresher training']
      },
      {
        category: 'response-time',
        standard: 'Answer calls within 3 rings or 20 seconds',
        measurement: 'Automatic call distribution (ACD) reports',
        target: '90% of calls answered within target',
        consequences: ['Schedule adjustment', 'Staffing review', 'Process improvement'],
        trainingRequirements: ['Time management training', 'Efficiency optimization']
      },
      {
        category: 'availability',
        standard: 'Maintain scheduled availability and adherence',
        measurement: 'Workforce management system tracking',
        target: '95% schedule adherence',
        consequences: ['Attendance counseling', 'Schedule modification', 'Disciplinary action'],
        trainingRequirements: ['Schedule management training', 'Time tracking procedures']
      },
      {
        category: 'documentation',
        standard: 'Complete and accurate call documentation',
        measurement: 'Documentation quality audits',
        target: '98% accuracy in call notes and follow-up actions',
        consequences: ['Documentation training', 'Quality coaching', 'System access review'],
        trainingRequirements: ['Documentation standards training', 'System-specific training']
      }
    ],
    qualityAssurance: {
      monitoringFrequency: 'Minimum 3 calls per agent per month',
      evaluationCriteria: [
        {
          category: 'Opening and Closing',
          weight: 15,
          criteria: ['Professional greeting', 'Proper identification', 'Appropriate closing'],
          scoringRubric: [
            { score: 5, description: 'Excellent - All elements perfect', examples: ['Warm, professional tone', 'Clear identification'] },
            { score: 4, description: 'Good - Minor improvements needed', examples: ['Slightly rushed greeting'] },
            { score: 3, description: 'Satisfactory - Meets basic requirements', examples: ['Standard greeting used'] },
            { score: 2, description: 'Needs Improvement - Missing elements', examples: ['Forgot company name'] },
            { score: 1, description: 'Unsatisfactory - Major deficiencies', examples: ['Unprofessional tone'] }
          ]
        },
        {
          category: 'Product Knowledge',
          weight: 25,
          criteria: ['Accurate information', 'Comprehensive explanations', 'Appropriate recommendations'],
          scoringRubric: [
            { score: 5, description: 'Expert level knowledge demonstrated', examples: ['Complex questions answered accurately'] },
            { score: 4, description: 'Strong knowledge with minor gaps', examples: ['Most questions answered well'] },
            { score: 3, description: 'Adequate knowledge for basic inquiries', examples: ['Standard questions handled'] },
            { score: 2, description: 'Limited knowledge, frequent hesitation', examples: ['Had to look up basic information'] },
            { score: 1, description: 'Insufficient knowledge for role', examples: ['Provided incorrect information'] }
          ]
        },
        {
          category: 'Customer Service',
          weight: 30,
          criteria: ['Active listening', 'Empathy', 'Problem resolution', 'Customer satisfaction'],
          scoringRubric: [
            { score: 5, description: 'Exceptional customer service', examples: ['Exceeded customer expectations'] },
            { score: 4, description: 'Strong customer focus', examples: ['Customer expressed satisfaction'] },
            { score: 3, description: 'Adequate service delivery', examples: ['Issue resolved appropriately'] },
            { score: 2, description: 'Service gaps identified', examples: ['Customer seemed frustrated'] },
            { score: 1, description: 'Poor customer experience', examples: ['Customer requested escalation'] }
          ]
        },
        {
          category: 'Compliance',
          weight: 30,
          criteria: ['Regulatory adherence', 'Documentation accuracy', 'Privacy protection'],
          scoringRubric: [
            { score: 5, description: 'Perfect compliance demonstrated', examples: ['All procedures followed exactly'] },
            { score: 4, description: 'Strong compliance with minor gaps', examples: ['One minor procedure missed'] },
            { score: 3, description: 'Adequate compliance', examples: ['Basic requirements met'] },
            { score: 2, description: 'Compliance concerns identified', examples: ['Important step skipped'] },
            { score: 1, description: 'Serious compliance violations', examples: ['Regulatory requirement ignored'] }
          ]
        }
      ],
      scoringSystem: {
        scale: '1-5',
        passingScore: 3.5,
        excellenceThreshold: 4.5,
        weightedCategories: true
      },
      improvementProcess: {
        coachingTriggers: ['Score below 3.5', 'Customer complaint', 'Compliance violation'],
        developmentPlans: ['Targeted skill training', 'Mentoring assignment', 'Additional practice sessions'],
        followUpSchedule: ['30-day coaching review', '60-day progress assessment', '90-day final evaluation'],
        escalationCriteria: ['No improvement after 90 days', 'Repeated compliance violations', 'Customer safety concerns']
      },
      calibrationRequirements: [
        {
          frequency: 'Monthly',
          participants: ['Quality analysts', 'Team supervisors', 'Training managers'],
          process: ['Review sample calls together', 'Discuss scoring differences', 'Align on standards'],
          documentation: ['Calibration session notes', 'Scoring alignment records', 'Standard updates']
        }
      ]
    },
    customerExperience: {
      serviceLevel: [
        {
          metric: 'Average Speed of Answer (ASA)',
          target: '20 seconds or less',
          measurement: 'ACD system reporting',
          reportingFrequency: 'Real-time dashboard, daily reports'
        },
        {
          metric: 'First Call Resolution (FCR)',
          target: '85% or higher',
          measurement: 'Follow-up call tracking and customer surveys',
          reportingFrequency: 'Weekly analysis, monthly trending'
        },
        {
          metric: 'Service Level',
          target: '80% of calls answered within 20 seconds',
          measurement: 'ACD system automatic calculation',
          reportingFrequency: 'Real-time monitoring, hourly reports'
        }
      ],
      customerSatisfaction: [
        {
          type: 'csat',
          target: 4.5,
          surveyMethod: 'Post-call automated survey',
          frequency: 'Every interaction'
        },
        {
          type: 'nps',
          target: 70,
          surveyMethod: 'Quarterly customer survey',
          frequency: 'Quarterly'
        },
        {
          type: 'ces',
          target: 2.0,
          surveyMethod: 'Post-resolution survey',
          frequency: 'After complex issues'
        }
      ],
      communicationStandards: [
        {
          channel: 'phone',
          responseTime: 'Answer within 20 seconds',
          qualityStandards: ['Professional greeting', 'Active listening', 'Clear explanations', 'Appropriate closing'],
          escalationCriteria: ['Customer requests supervisor', 'Complex technical issues', 'Compliance concerns']
        },
        {
          channel: 'email',
          responseTime: 'Acknowledge within 2 hours, resolve within 24 hours',
          qualityStandards: ['Professional format', 'Complete information', 'Clear next steps', 'Appropriate tone'],
          escalationCriteria: ['Legal implications', 'Executive complaints', 'Media inquiries']
        },
        {
          channel: 'chat',
          responseTime: 'Initial response within 30 seconds',
          qualityStandards: ['Prompt responses', 'Accurate information', 'Professional language', 'Efficient resolution'],
          escalationCriteria: ['Technical limitations', 'Complex product questions', 'Dissatisfied customers']
        }
      ],
      resolutionStandards: [
        {
          category: 'General Inquiries',
          targetResolutionTime: 'Same call resolution',
          escalationTriggers: ['Information not readily available', 'System access issues'],
          documentationRequirements: ['Call summary', 'Resolution provided', 'Follow-up needed']
        },
        {
          category: 'Claims Assistance',
          targetResolutionTime: '24-48 hours for status updates',
          escalationTriggers: ['Claim disputes', 'Provider network issues', 'Coverage questions'],
          documentationRequirements: ['Claim details', 'Customer communication', 'Action items', 'Follow-up schedule']
        }
      ]
    },
    technologySystems: [
      {
        system: 'Customer Relationship Management (CRM)',
        purpose: 'Comprehensive customer data and interaction management',
        trainingRequirements: [
          'CRM navigation and search',
          'Customer profile management',
          'Interaction logging and notes',
          'Task and follow-up management',
          'Reporting and analytics'
        ],
        certificationNeeded: true,
        updateFrequency: 'Quarterly system updates',
        integrations: ['Phone system', 'Email platform', 'Document management', 'Billing system']
      },
      {
        system: 'Automatic Call Distribution (ACD)',
        purpose: 'Intelligent call routing and queue management',
        trainingRequirements: [
          'Call routing understanding',
          'Queue management',
          'Skill-based routing',
          'Real-time adherence',
          'Break and lunch procedures'
        ],
        certificationNeeded: false,
        updateFrequency: 'As needed',
        integrations: ['CRM system', 'Workforce management', 'Quality monitoring']
      },
      {
        system: 'Quality Monitoring Platform',
        purpose: 'Call recording, evaluation, and performance tracking',
        trainingRequirements: [
          'Call recording compliance',
          'Evaluation form completion',
          'Performance dashboard usage',
          'Coaching session scheduling',
          'Improvement plan tracking'
        ],
        certificationNeeded: true,
        updateFrequency: 'Semi-annually',
        integrations: ['Phone system', 'CRM', 'Learning management system']
      }
    ],
    performanceMetrics: [
      {
        name: 'Average Handle Time (AHT)',
        description: 'Average time spent on each customer interaction including talk time and after-call work',
        target: '8-12 minutes depending on call type',
        measurement: 'ACD system automatic calculation',
        frequency: 'Real-time monitoring, daily reporting',
        consequences: [
          { condition: 'AHT consistently above target', action: 'Efficiency coaching', timeline: 'Within 1 week' },
          { condition: 'AHT significantly below target', action: 'Quality review for rushed calls', timeline: 'Within 3 days' }
        ]
      },
      {
        name: 'Customer Satisfaction Score (CSAT)',
        description: 'Customer rating of service quality and satisfaction',
        target: '4.5/5.0 or higher',
        measurement: 'Post-call surveys and feedback',
        frequency: 'Continuous collection, weekly analysis',
        consequences: [
          { condition: 'CSAT below 4.0', action: 'Customer service coaching', timeline: 'Within 2 weeks' },
          { condition: 'CSAT below 3.5', action: 'Intensive retraining program', timeline: 'Immediate' }
        ]
      },
      {
        name: 'Quality Assurance Score',
        description: 'Evaluation score based on call monitoring and quality criteria',
        target: '90% or higher',
        measurement: 'Monthly quality evaluations',
        frequency: 'Monthly evaluation, quarterly trending',
        consequences: [
          { condition: 'QA score below 85%', action: 'Performance improvement plan', timeline: 'Within 1 month' },
          { condition: 'QA score below 75%', action: 'Intensive coaching and retraining', timeline: 'Immediate' }
        ]
      }
    ],
    escalationProcedures: [
      {
        trigger: 'Customer requests supervisor',
        level: 1,
        escalationTo: 'Agent Senior',
        timeframe: 'Immediate transfer or callback within 30 minutes',
        documentation: ['Reason for escalation', 'Customer concern summary', 'Actions attempted'],
        followUp: ['Supervisor resolution confirmation', 'Customer satisfaction check']
      },
      {
        trigger: 'Compliance violation suspected',
        level: 2,
        escalationTo: 'Compliance Officer',
        timeframe: 'Within 2 hours',
        documentation: ['Detailed incident report', 'Potential violation description', 'Evidence collected'],
        followUp: ['Compliance investigation', 'Corrective action plan', 'Training reinforcement']
      },
      {
        trigger: 'Legal or regulatory concern',
        level: 3,
        escalationTo: 'Legal Department and Senior Management',
        timeframe: 'Immediate notification',
        documentation: ['Comprehensive incident report', 'Legal implications assessment', 'Immediate actions taken'],
        followUp: ['Legal review', 'Regulatory notification if required', 'Process improvement']
      }
    ],
    complianceMonitoring: {
      callRecording: {
        mandatory: true,
        retentionPeriod: '7 years for insurance transactions',
        accessControls: ['Role-based access', 'Audit trail logging', 'Secure storage'],
        consentRequirements: ['Customer notification of recording', 'Opt-out procedures where legally allowed'],
        qualityReview: ['Random sampling', 'Targeted monitoring', 'Complaint-triggered review']
      },
      dataHandling: [
        {
          dataType: 'Personal Health Information (PHI)',
          handlingProcedures: ['HIPAA-compliant processing', 'Minimum necessary standard', 'Secure transmission'],
          accessRestrictions: ['Need-to-know basis', 'Role-based permissions', 'Activity logging'],
          retentionPeriod: '6 years after policy termination',
          disposalRequirements: ['Secure deletion', 'Certificate of destruction', 'Audit trail']
        },
        {
          dataType: 'Financial Information',
          handlingProcedures: ['PCI DSS compliance', 'Encryption requirements', 'Secure processing'],
          accessRestrictions: ['Authorized personnel only', 'Multi-factor authentication', 'Session monitoring'],
          retentionPeriod: '7 years for tax and audit purposes',
          disposalRequirements: ['Secure wiping', 'Physical destruction', 'Compliance verification']
        }
      ],
      auditRequirements: [
        {
          type: 'Quality Assurance Audit',
          frequency: 'Monthly',
          scope: ['Call quality', 'Documentation accuracy', 'Process compliance'],
          documentation: ['Audit reports', 'Finding summaries', 'Corrective action plans'],
          remediation: ['Training reinforcement', 'Process updates', 'System improvements']
        },
        {
          type: 'Compliance Audit',
          frequency: 'Quarterly',
          scope: ['Regulatory compliance', 'Data protection', 'Consumer rights'],
          documentation: ['Compliance reports', 'Violation tracking', 'Remediation plans'],
          remediation: ['Policy updates', 'Additional training', 'System enhancements']
        }
      ],
      reportingObligations: [
        {
          report: 'Customer Complaint Summary',
          frequency: 'Monthly',
          recipients: ['State Insurance Department', 'Internal Compliance'],
          deadline: '15th of following month',
          consequences: ['Regulatory scrutiny', 'Fines for late reporting', 'License review']
        },
        {
          report: 'Data Breach Notification',
          frequency: 'As needed',
          recipients: ['Regulatory authorities', 'Affected customers', 'Internal stakeholders'],
          deadline: '72 hours for authorities, without undue delay for customers',
          consequences: ['Regulatory fines', 'Legal action', 'Reputation damage']
        }
      ]
    }
  }
};

export const healthInsuranceSpecialization: HealthInsuranceSpecialization = {
  regulatoryKnowledge: [
    {
      regulation: 'Affordable Care Act (ACA)',
      description: 'Federal healthcare reform law governing health insurance markets',
      applicableStates: ['All 50 states'],
      updateFrequency: 'Annual with periodic regulatory guidance',
      penaltyForNonCompliance: 'License suspension, fines up to $50,000, criminal charges',
      trainingModules: [
        'ACA Fundamentals and Market Reforms',
        'Essential Health Benefits Requirements',
        'Premium Tax Credits and Cost-sharing Reductions',
        'Special Enrollment Periods and Qualifying Events',
        'Employer Shared Responsibility Provisions'
      ]
    },
    {
      regulation: 'HIPAA Privacy and Security Rules',
      description: 'Federal privacy and security standards for protected health information',
      applicableStates: ['All 50 states'],
      updateFrequency: 'As needed with HHS guidance updates',
      penaltyForNonCompliance: 'Fines from $100 to $50,000 per violation, criminal charges possible',
      trainingModules: [
        'HIPAA Privacy Rule Fundamentals',
        'Security Rule Technical Safeguards',
        'Breach Notification Requirements',
        'Business Associate Agreements',
        'Patient Rights and Access Procedures'
      ]
    },
    {
      regulation: 'State Insurance Licensing Laws',
      description: 'State-specific licensing, continuing education, and practice requirements',
      applicableStates: ['Varies by state of practice'],
      updateFrequency: 'Varies by state, typically annually',
      penaltyForNonCompliance: 'License revocation, fines, prohibition from practice',
      trainingModules: [
        'State Licensing Requirements Overview',
        'Continuing Education Compliance',
        'State-Specific Market Conduct Rules',
        'Appointment and Contracting Procedures',
        'State Insurance Department Reporting'
      ]
    }
  ],
  productKnowledge: [
    {
      category: 'individual',
      products: [
        {
          name: 'Bronze Health Plans',
          type: 'ACA-compliant individual coverage',
          keyFeatures: ['Lower premiums', 'Higher deductibles', 'Essential health benefits', '60% actuarial value'],
          targetMarket: 'Young, healthy individuals seeking catastrophic protection',
          competitiveAdvantages: ['Affordability', 'HSA compatibility', 'Preventive care coverage'],
          commonObjections: ['High deductible concerns', 'Limited provider networks'],
          salesPoints: ['Cost-effective protection', 'Tax advantages with HSA', 'Preventive care at no cost']
        },
        {
          name: 'Silver Health Plans',
          type: 'ACA-compliant individual coverage with cost-sharing reductions',
          keyFeatures: ['Moderate premiums', 'Moderate deductibles', 'Cost-sharing reductions available', '70% actuarial value'],
          targetMarket: 'Middle-income individuals and families seeking balanced coverage',
          competitiveAdvantages: ['Premium tax credit eligibility', 'Cost-sharing reductions', 'Balanced cost-sharing'],
          commonObjections: ['Premium costs', 'Network limitations'],
          salesPoints: ['Government subsidies available', 'Predictable out-of-pocket costs', 'Comprehensive coverage']
        }
      ],
      competencyRequirements: [
        'Explain actuarial value and cost-sharing',
        'Calculate premium tax credits and subsidies',
        'Compare plan networks and formularies',
        'Identify qualifying life events for special enrollment'
      ]
    },
    {
      category: 'medicare',
      products: [
        {
          name: 'Medicare Advantage Plans',
          type: 'Medicare Part C managed care plans',
          keyFeatures: ['All-in-one coverage', 'Additional benefits', 'Network restrictions', 'Annual enrollment'],
          targetMarket: 'Medicare beneficiaries seeking comprehensive coverage with additional benefits',
          competitiveAdvantages: ['Extra benefits like dental/vision', 'Prescription drug coverage included', 'Care coordination'],
          commonObjections: ['Network limitations', 'Prior authorization requirements'],
          salesPoints: ['Comprehensive coverage', 'Additional benefits at no extra cost', 'Coordinated care management']
        }
      ],
      competencyRequirements: [
        'Understand Medicare eligibility and enrollment periods',
        'Explain Medicare Advantage vs. Original Medicare',
        'Navigate Medicare plan comparison tools',
        'Comply with Medicare marketing regulations'
      ]
    }
  ],
  salesProcess: [
    {
      stage: 'prospecting',
      skills: ['Lead qualification', 'Referral generation', 'Digital marketing', 'Networking'],
      tools: ['CRM system', 'Lead scoring tools', 'Social media platforms', 'Referral tracking'],
      metrics: ['Lead conversion rate', 'Cost per lead', 'Referral rate', 'Pipeline velocity'],
      bestPractices: [
        'Focus on warm referrals and networking',
        'Utilize digital marketing for lead generation',
        'Qualify leads thoroughly before investing time',
        'Maintain consistent follow-up schedule'
      ]
    },
    {
      stage: 'needs-analysis',
      skills: ['Active listening', 'Questioning techniques', 'Risk assessment', 'Financial analysis'],
      tools: ['Needs analysis worksheets', 'Risk assessment tools', 'Budget calculators', 'Health questionnaires'],
      metrics: ['Needs identification accuracy', 'Customer satisfaction with consultation', 'Time to complete analysis'],
      bestPractices: [
        'Use open-ended questions to understand full situation',
        'Document all family members and their needs',
        'Assess both current and future healthcare needs',
        'Consider budget constraints and priorities'
      ]
    }
  ],
  customerService: [
    {
      scenario: 'Claims Assistance and Advocacy',
      skills: ['Claims process knowledge', 'Provider communication', 'Escalation management', 'Documentation'],
      regulations: ['HIPAA privacy requirements', 'State prompt payment laws', 'Appeals process regulations'],
      escalationProcedures: ['Internal escalation to claims specialist', 'Carrier escalation process', 'State insurance department complaint'],
      documentationRequirements: ['Claim details and timeline', 'Customer communication log', 'Resolution actions taken']
    }
  ],
  compliance: [
    {
      area: 'Marketing and Advertising',
      requirements: [
        'All marketing materials must be approved by carriers',
        'Cannot make misleading or false statements',
        'Must include required disclaimers and disclosures',
        'Social media posts must comply with advertising standards'
      ],
      documentation: ['Marketing material approval records', 'Advertising compliance checklist', 'Social media policy acknowledgment'],
      auditPreparation: ['Maintain marketing material files', 'Document approval processes', 'Track all advertising activities'],
      violationConsequences: ['License suspension', 'Carrier appointment termination', 'Fines and penalties', 'Required remedial training']
    }
  ],
  technology: [
    {
      system: 'Brokerage Management Platform',
      functionality: ['Customer management', 'Quote generation', 'Enrollment processing', 'Commission tracking'],
      integrations: ['Carrier systems', 'Payment processors', 'Document management', 'Compliance tracking'],
      troubleshooting: ['System login issues', 'Quote calculation errors', 'Enrollment submission failures', 'Report generation problems'],
      securityRequirements: ['Multi-factor authentication', 'Regular password updates', 'Secure document handling', 'Access logging']
    }
  ]
};