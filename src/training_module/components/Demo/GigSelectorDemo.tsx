import React, { useState } from 'react';
import { GigFromApi } from '../../types';
import GigSelector from '../Dashboard/GigSelector';

/**
 * Demo page to showcase the GigSelector component
 * This can be used for testing and demonstration purposes
 */
export default function GigSelectorDemo() {
  const [selectedGig, setSelectedGig] = useState<GigFromApi | null>(null);
  
  // Default company ID from requirements
  const DEMO_COMPANY_ID = '68cab073cfa9381f0ed56393';

  const handleGigSelect = (gig: GigFromApi) => {
    setSelectedGig(gig);
    console.log('Selected Gig:', gig);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Gig Selector Demo
          </h1>
          <p className="text-xl text-gray-600">
            Browse and select from available gig positions
          </p>
          <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            <span className="font-medium">Company ID:</span> {DEMO_COMPANY_ID}
          </div>
        </div>

        {/* Gig Selector */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <GigSelector
            companyId={DEMO_COMPANY_ID}
            onGigSelect={handleGigSelect}
            selectedGigId={selectedGig?._id}
          />
        </div>

        {/* Selected Gig Details */}
        {selectedGig && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Selected Gig Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Title:</span>
                    <span className="text-gray-900">{selectedGig.title}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Category:</span>
                    <span className="text-gray-900">{selectedGig.category}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Status:</span>
                    <span className="text-gray-900">{selectedGig.status}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">ID:</span>
                    <span className="text-gray-900 text-xs">{selectedGig._id}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Seniority & Experience</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Level:</span>
                    <span className="text-gray-900">{selectedGig.seniority.level}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Experience:</span>
                    <span className="text-gray-900">{selectedGig.seniority.yearsExperience} years</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Availability</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Daily Hours:</span>
                    <span className="text-gray-900">{selectedGig.availability.minimumHours.daily}h</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Weekly Hours:</span>
                    <span className="text-gray-900">{selectedGig.availability.minimumHours.weekly}h</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Monthly Hours:</span>
                    <span className="text-gray-900">{selectedGig.availability.minimumHours.monthly}h</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Flexibility:</span>
                    <span className="text-gray-900">{selectedGig.availability.flexibility.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Compensation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Type:</span>
                    <span className="text-gray-900">{selectedGig.commission.base}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Base Amount:</span>
                    <span className="text-gray-900">
                      {selectedGig.commission.baseAmount} {selectedGig.commission.currency.symbol}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Bonus:</span>
                    <span className="text-gray-900">
                      {selectedGig.commission.bonusAmount} {selectedGig.commission.currency.symbol}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-600 w-32">Currency:</span>
                    <span className="text-gray-900">
                      {selectedGig.commission.currency.name} ({selectedGig.commission.currency.code})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{selectedGig.description}</p>
            </div>

            {selectedGig.commission.additionalDetails && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Details</h3>
                <p className="text-gray-700 leading-relaxed">{selectedGig.commission.additionalDetails}</p>
              </div>
            )}

            {selectedGig.industries && selectedGig.industries.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Industries</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGig.industries.map((industry) => (
                    <span
                      key={industry._id}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {industry.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedGig.skills.languages && selectedGig.skills.languages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Required Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGig.skills.languages.map((lang: any, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {lang.language.name} - {lang.proficiency}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedGig.destination_zone && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Location</h3>
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedGig.destination_zone.flags.png}
                    alt={selectedGig.destination_zone.name.common}
                    className="w-8 h-6 object-cover rounded shadow"
                  />
                  <span className="text-gray-900 font-medium">
                    {selectedGig.destination_zone.name.common}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">JSON Data</h3>
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw JSON
                </summary>
                <pre className="mt-4 text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedGig, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

