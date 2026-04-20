export const aiPrompts = {
  basic: {
    title: "Basic Information Assistant",
    description: "Get AI suggestions for your gig's basic information"
  },
  schedule: {
    title: "Schedule Assistant",
    description: "Get AI suggestions for scheduling and time management"
  },
  commission: {
    title: "Commission Assistant",
    description: "Get AI suggestions for commission structure"
  },
  leads: {
    title: "Leads Assistant",
    description: "Get AI suggestions for lead management"
  },
  skills: {
    title: "Skills Assistant",
    description: "Get AI suggestions for required skills"
  },
  team: {
    title: "Team Assistant",
    description: "Get AI suggestions for team structure"
  },
  docs: {
    title: "Documentation Assistant",
    description: "Get AI suggestions for documentation"
  }
};

export const predefinedOptions = {
  basic: {
    categories: [
      'Inbound Sales',
      'Outbound Sales',
      'Customer Service',
      'Technical Support',
      'Account Management',
      'Lead Generation',
      'Market Research',
      'Appointment Setting',
      'Order Processing',
      'Customer Retention',
      'Billing Support',
      'Product Support',
      'Help Desk',
      'Chat Support',
      'Email Support',
      'Social Media Support',
      'Survey Calls',
      'Welcome Calls',
      'Follow-up Calls',
      'Complaint Resolution',
      'Warranty Support',
      'Collections',
      'Dispatch Services',
      'Emergency Support',
      'Multilingual Support'
    ],
    seniorityLevels: [
      'Agent Senior',
      'Agent',
      'Agent Junior',
      'Supervisor',
    ],
    timeZones: [
      'New York (EST/EDT)',
      'Chicago (CST/CDT)',
      'Denver (MST/MDT)',
      'Los Angeles (PST/PDT)',
      'London (GMT/BST)',
      'Paris (CET/CEST)',
      'Dubai (GST)',
      'Singapore (SGT)',
      'Tokyo (JST)',
      'Sydney (AEST/AEDT)'
    ],
    destinationZones: [
      'France',
      'United States',
      'United Kingdom',
      'Germany',
      'Spain',
      'Italy',
      'Canada',
      'Australia',
      'Morocco',
      'Turkey'
    ]
  },
  sectors: [
    'Inbound Sales',
    'Outbound Sales',
    'Customer Service',
    'Technical Support',
    'Account Management',
    'Lead Generation',
    'Market Research',
    'Appointment Setting',
    'Order Processing',
    'Customer Retention',
    'Billing Support',
    'Product Support',
    'Help Desk',
    'Chat Support',
    'Email Support',
    'Social Media Support',
    'Survey Calls',
    'Welcome Calls',
    'Follow-up Calls',
    'Complaint Resolution',
    'Warranty Support',
    'Collections',
    'Dispatch Services',
    'Emergency Support',
    'Multilingual Support'
  ],
  // Industries and activities are now loaded dynamically from API
  // See src/lib/activitiesIndustries.ts for data loading
  industries: [],
  activities: [],
  availability: {
    schedule: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ],
    timeZones: [
      'New York (EST/EDT)',
      'Chicago (CST/CDT)',
      'Denver (MST/MDT)',
      'Los Angeles (PST/PDT)',
      'London (GMT/BST)',
      'Paris (CET/CEST)',
      'Dubai (GST)',
      'Singapore (SGT)',
      'Tokyo (JST)',
      'Sydney (AEST/AEDT)'
    ]
  },
  commission: {
    // Structure strictly defined by user requirements:
    // commission_per_call (number)
    // bonusAmount (string)
    // currency (ObjectId)
    // minimumVolume (Object)
    // transactionCommission (number)
    // additionalDetails (string)
    minimumVolumeUnits: [] as string[],
    minimumVolumePeriods: ['Daily', 'Weekly', 'Monthly'],
    currencies: [] as any[] // Loaded dynamically from API, but defined here for type safety
  },
  skills: {
    // Skills are now loaded from API endpoints
    // See: /api/skills/soft, /api/skills/professional, /api/skills/technical
    skillLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    languages: [
      { language: 'English', code: 'en' },
      { language: 'French', code: 'fr' },
      { language: 'Spanish', code: 'es' },
      { language: 'German', code: 'de' },
      { language: 'Italian', code: 'it' },
      { language: 'Portuguese', code: 'pt' },
      { language: 'Arabic', code: 'ar' },
      { language: 'Mandarin', code: 'zh' }
    ],
    technical: [],
    soft: [],
    professional: []
  },
  team: {
    roles: [
      {
        id: 'Agent Senior',
        name: 'Agent Senior',
        description: 'Experienced agent with advanced skills and mentoring capabilities'
      },
      {
        id: 'Agent',
        name: 'Agent',
        description: 'Handles customer interactions and core responsibilities'
      },
      {
        id: 'Agent Junior',
        name: 'Agent Junior',
        description: 'Entry-level agent with basic responsibilities and learning focus'
      },
      {
        id: 'Supervisor',
        name: 'Supervisor',
        description: 'Oversees team operations and provides guidance'
      }
    ],
    territories: [
      'North America',
      'Europe',
      'Asia Pacific',
      'Latin America',
      'Middle East',
      'Africa',
      'United States',
      'Canada',
      'United Kingdom',
      'France',
      'Germany',
      'Spain',
      'Italy',
      'Australia',
      'Japan',
      'China',
      'India',
      'Brazil',
      'Mexico',
      'South Africa'
    ]
  },
  leads: {
    sources: []
  },
  schedule: {
    flexibility: [
      "Remote Work Available",
      "Flexible Hours",
      "Weekend Rotation",
      "Night Shift Available",
      "Split Shifts",
      "Part-Time Options",
      "Compressed Work Week",
      "Shift Swapping Allowed"
    ]
  },
  metrics: {
    kpis: [
      'Call Volume',
      'Conversion Rate',
      'Customer Satisfaction (CSAT)',
      'Average Handle Time (AHT)',
      'First Call Resolution (FCR)',
      'Net Promoter Score (NPS)',
      'Qualified Leads Generated',
      'Sales Revenue',
      'Attendance Rate',
      'Quality Monitoring Score'
    ]
  }
};

export const sectionGuidance = {
  basic: {
    title: 'Basic Information',
    steps: [
      'Enter a clear and descriptive title for the role',
      'Select the appropriate category',
      'Choose the seniority level',
      'Specify required years of experience'
    ],
    tips: [
      'Use industry-standard job titles for better visibility',
      'Be specific about the role category to attract the right candidates',
      'Match seniority level with experience requirements',
      'Consider both minimum and preferred experience levels'
    ]
  },
  availability: {
    title: 'Availability',
    steps: [
      'Select working days',
      'Define working hours',
      'Specify time zones',
      'Set minimum hour requirements',
      'Choose flexibility options'
    ],
    tips: [
      'Consider multiple time zones for global coverage',
      'Be clear about shift patterns and rotations',
      'Include any flexibility in scheduling',
      'Specify both core hours and flexible time slots'
    ]
  },
  schedule: {
    title: 'Schedule & Availability',
    steps: [
      'Select working days',
      'Define working hours',
      'Specify time zones',
      'Set minimum hour requirements',
      'Choose flexibility options'
    ],
    tips: [
      'Consider multiple time zones for global coverage',
      'Be clear about shift patterns and rotations',
      'Include any flexibility in scheduling',
      'Specify both core hours and flexible time slots'
    ]
  },
  commission: {
    title: 'Commission Structure',
    steps: [
      'Select the currency',
      'Choose the commission type',
      'Set base amounts',
      'Define bonus structure',
      'Add detailed commission terms'
    ],
    tips: [
      'Be transparent about commission calculations',
      'Include all potential bonus opportunities',
      'Clearly explain performance targets',
      'Specify payment frequency and terms'
    ]
  },
  leads: {
    title: 'Lead Distribution',
    steps: [
      'Define lead types and percentages',
      'Describe each lead category',
      'List lead sources',
      'Set distribution rules'
    ],
    tips: [
      'Balance the mix of hot, warm, and cold leads',
      'Be specific about lead quality criteria',
      'Explain the lead assignment process',
      'Include information about lead follow-up expectations'
    ]
  },
  skills: {
    title: 'Required Skills',
    steps: [
      'Select required languages',
      'Choose technical skills',
      'Add soft skills',
      'Specify required tools'
    ],
    tips: [
      'Prioritize must-have vs. nice-to-have skills',
      'Be specific about language proficiency levels',
      'Include both technical and soft skills',
      'List relevant tools and software'
    ]
  },
  team: {
    title: 'Team Structure',
    steps: [
      'Define team size',
      'List team roles',
      'Select target countries',
      'Set reporting relationships'
    ],
    tips: [
      'Be clear about team hierarchy',
      'Include cross-functional relationships',
      'Specify country coverage requirements',
      'Define collaboration requirements'
    ]
  },

};
