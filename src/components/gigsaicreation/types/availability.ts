export interface AvailabilityHours {
  start: string;
  end: string;
}

export interface ScheduleDay {
  day: string;
  hours: AvailabilityHours;
  _id?: {
    $oid: string;
  };
}

export interface MinimumHours {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface Availability {
  schedule: ScheduleDay[];
  timeZone: string;
  flexibility: string[];
  minimumHours: MinimumHours;
}

export const defaultAvailability: Availability = {
  schedule: [
    {
      day: "Monday",
      hours: {
        start: "09:00",
        end: "18:00"
      }
    },
    {
      day: "Tuesday",
      hours: {
        start: "09:00",
        end: "18:00"
      }
    },
    {
      day: "Wednesday",
      hours: {
        start: "09:00",
        end: "18:00"
      }
    },
    {
      day: "Thursday",
      hours: {
        start: "09:00",
        end: "18:00"
      }
    },
    {
      day: "Friday",
      hours: {
        start: "09:00",
        end: "18:00"
      }
    }
  ],
  timeZone: "Paris (CET/CEST)",
  flexibility: [
    "Remote Work Available",
    "Flexible Hours"
  ],
  minimumHours: {
    daily: 8,
    weekly: 40,
    monthly: 160
  }
}; 