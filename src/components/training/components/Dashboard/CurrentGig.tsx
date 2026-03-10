import React from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Gig } from '../../types';

interface CurrentGigProps {
  gig: Gig;
}

export default function CurrentGig({ gig }: CurrentGigProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Gig</h2>
          <h3 className="text-xl font-bold text-blue-600 mb-2">{gig.title}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(gig.status)}`}>
          {gig.status.charAt(0).toUpperCase() + gig.status.slice(1)}
        </span>
      </div>

      <p className="text-gray-600 mb-4">{gig.description}</p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{gig.department}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Started {gig.startDate}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{gig.duration}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Team Assignment</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Continue Onboarding
        </button>
      </div>
    </div>
  );
}