import { GigData } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string[] };
  warnings: { [key: string]: string[] };
}

export function validateGigData(data: GigData): ValidationResult {
  const errors: { [key: string]: string[] } = {};
  const warnings: { [key: string]: string[] } = {};

  // Basic Info
  if (!data.title?.trim()) {
    warnings.basic = [...(warnings.basic || []), 'Consider adding a title'];
  } else if (data.title.length < 3) {
    warnings.basic = [...(warnings.basic || []), 'Consider making the title at least 10 characters long'];
  }

  if (!data.description?.trim()) {
    warnings.basic = [...(warnings.basic || []), 'Consider adding a description'];
  } else if (data.description.length < 10) {
    warnings.basic = [...(warnings.basic || []), 'Consider adding more details to the description'];
  }

  if (!data.category) {
    warnings.basic = [...(warnings.basic || []), 'Consider selecting a category'];
  }

  // Schedule
  if (!data.schedule) {
    warnings.schedule = [...(warnings.schedule || []), 'Consider adding schedule information'];
  } else {
    if (!data.schedule.schedules?.length) {
      warnings.schedule = [...(warnings.schedule || []), 'Consider specifying working days'];
    }

    // Check if there are any schedules with hours
    const hasHours = data.schedule.schedules?.some(schedule =>
      schedule.hours?.start && schedule.hours?.end
    );
    if (!hasHours) {
      warnings.schedule = [...(warnings.schedule || []), 'Consider specifying working hours'];
    }

    if (!data.schedule.timeZones?.length) {
      warnings.schedule = [...(warnings.schedule || []), 'Consider adding at least one time zone'];
    }
  }

  // Commission
  if (!data.commission) {
    warnings.commission = [...(warnings.commission || []), 'Consider adding commission information'];
  } else {
    if (!data.commission?.currency) {
      warnings.commission = [...(warnings.commission || []), 'Consider specifying the currency'];
    }

    if (data.commission.commission_per_call === undefined || data.commission.commission_per_call === null) {
      warnings.commission = [...(warnings.commission || []), 'Consider specifying Per call compensation'];
    }

    if (data.commission?.minimumVolume) {
      if (!data.commission.minimumVolume.amount) {
        warnings.commission = [...(warnings.commission || []), 'Consider specifying minimum volume amount'];
      }
      if (!data.commission.minimumVolume.unit) {
        warnings.commission = [...(warnings.commission || []), 'Consider specifying minimum volume unit'];
      }
      if (!data.commission.minimumVolume.period) {
        warnings.commission = [...(warnings.commission || []), 'Consider specifying minimum volume period'];
      }
    }
  }

  // Team
  if (!data.team) {
    warnings.team = [...(warnings.team || []), 'Consider adding team information'];
  } else {
    if (!data.team.size) {
      warnings.team = [...(warnings.team || []), 'Consider specifying team size'];
    }

    if (!data.team.structure?.length) {
      warnings.team = [...(warnings.team || []), 'Consider adding team structure'];
    }

    if (!data.team.territories?.length) {
      warnings.team = [...(warnings.team || []), 'Consider adding at least one territory'];
    }
  }

  // Leads
  if (data.leads?.types?.length) {
    const totalLeadPercentage = data.leads.types.reduce((sum, type) => sum + type.percentage, 0);
    if (totalLeadPercentage !== 100) {
      warnings.leads = [...(warnings.leads || []), 'Lead type percentages should sum to 100%'];
    }
  }

  if (!data.leads?.sources?.length) {
    warnings.leads = [...(warnings.leads || []), 'Consider adding at least one lead source'];
  }

  // Skills
  if (!data.skills?.languages?.length) {
    warnings.skills = [...(warnings.skills || []), 'Consider specifying required languages'];
  }

  if (!data.skills?.professional?.length) {
    warnings.skills = [...(warnings.skills || []), 'Consider adding professional skills requirements'];
  }



  return {
    isValid: true, // Always valid since nothing is required
    errors,
    warnings
  };
}