export function mapToStandardTimeZone(input: string): string {
  const timeZoneMap: { [key: string]: string } = {
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'GMT': 'Europe/London',
    'BST': 'Europe/London',
    'CET': 'Europe/Paris',
    'CEST': 'Europe/Paris',
    'GST': 'Europe/Dubai',
    'SGT': 'Asia/Singapore',
    'JST': 'Asia/Tokyo',
    'AEST': 'Australia/Sydney',
    'AEDT': 'Australia/Sydney'
  };

  const normalizedInput = input.trim().toUpperCase();
  return timeZoneMap[normalizedInput] || 'Unknown';
} 
