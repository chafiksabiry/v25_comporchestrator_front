// TimezoneCode type removed with OpenAI integration
type TimezoneCode = string;

export interface AIPrompt {
  title: string;
  description: string;
  suggestions: string[];
  systemPrompt: string;
}

export const aiPrompts = {
  availability: {
    title: 'Availability',
    description: 'Let AI help you determine the optimal availability based on your target markets and business hours.',
    suggestions: [
      'Optimal availability for global coverage',
      'Working hours alignment',
      'Schedule flexibility recommendations',
      'Team distribution suggestions'
    ],
    systemPrompt: `Based on the following business requirements, suggest optimal availability:
- Target markets: {markets}
- Business hours: {hours}
- Team distribution: {distribution}
- Coverage requirements: {coverage}

Please provide:
1. Working days and hours
2. Time zone recommendations
3. Flexibility options
4. Minimum hour requirements`
  },
  schedule: {
    title: 'Schedule & Time Zone Suggestions',
    description: 'Let AI help you determine the optimal time zones based on your target markets and business hours.',
    suggestions: [
      'Optimal time zones for global coverage',
      'Working hours alignment',
      'Schedule flexibility recommendations',
      'Team distribution suggestions'
    ],
    systemPrompt: `Based on the following business requirements, suggest optimal time zones and working hours:
- Target markets: {markets}
- Business hours: {hours}
- Team distribution: {distribution}
- Coverage requirements: {coverage}

Please provide:
1. Primary time zones for operations
2. Suggested working hours in each time zone
3. Schedule flexibility recommendations
4. Coverage analysis and gaps`
  }
};

export interface TimezoneGenerationRequest {
  targetMarkets: string[];
  businessHours?: string;
  teamDistribution?: string;
  coverageRequirements?: string;
}

export interface TimezoneGenerationResponse {
  suggestedTimezones: TimezoneCode[];
  workingHours: {
    start: string;
    end: string;
  };
  coverageAnalysis: string;
  flexibilityRecommendations: string[];
}

export async function generateTimezoneRecommendations(
  request: TimezoneGenerationRequest
): Promise<TimezoneGenerationResponse> {
  // OpenAI functionality moved to backend - return default fallback
  return {
    suggestedTimezones: ['New York (EST/EDT)', 'London (GMT/BST)', 'Singapore (SGT)'],
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    coverageAnalysis: 'Coverage across major global business hours with focus on US, Europe, and Asia',
    flexibilityRecommendations: [
      'Consider split shifts for 24/7 coverage',
      'Implement rotating schedules for global team members',
      'Allow flexible hours within core business times'
    ]
  };
} 