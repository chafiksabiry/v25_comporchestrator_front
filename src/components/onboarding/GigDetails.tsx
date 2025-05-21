import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

interface Gig {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  // Add other gig fields as needed
}

interface GigResponse {
  data: Gig[];
}

const GigDetails = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const companyId = Cookies.get('companyId');

  useEffect(() => {
    const fetchGigs = async () => {
      if (!companyId) {
        setError('Company ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get<GigResponse>(`${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`);
        setGigs(response.data.data);
      } catch (err) {
        setError('Failed to fetch gigs');
        console.error('Error fetching gigs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGigs();
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Gig Details</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {gigs.map((gig) => (
              <tr key={gig._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {gig.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {gig.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${gig.status === 'active' ? 'bg-green-100 text-green-800' : 
                      gig.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {gig.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(gig.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gigs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No gigs found for this company.
        </div>
      )}
    </div>
  );
};

export default GigDetails; 