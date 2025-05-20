import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, Globe, MapPin, FileText, Users, CreditCard } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';

interface CompanyContact {
  email: string;
  phone: string;
  address: string;
  website: string;
}

interface Company {
  _id: string;
  name: string;
  industry: string;
  headquarters: string;
  contact: CompanyContact;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Company;
}

interface ContactInfo {
  name: string;
  position: string;
  email: string;
  phone: string;
}

interface FormData {
  companyName: string;
  registrationNumber: string;
  vatNumber: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  primaryContact: ContactInfo;
  billingContact: ContactInfo;
  technicalContact: ContactInfo;
}

const CompanyProfile = () => {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    registrationNumber: '',
    vatNumber: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    country: '',
    primaryContact: {
      name: '',
      position: '',
      email: '',
      phone: ''
    },
    billingContact: {
      name: '',
      position: '',
      email: '',
      phone: ''
    },
    technicalContact: {
      name: '',
      position: '',
      email: '',
      phone: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const industries = [
    'Technology',
    'Healthcare',
    'Financial Services',
    'Retail',
    'Manufacturing',
    'Education',
    'Real Estate',
    'Other'
  ];

  const countries = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Other'
  ];

  const companyId = Cookies.get('companyId');

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<ApiResponse>(`${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/details`);
        if (response.data.success) {
          const company = response.data.data;
          setFormData({
            companyName: company.name || '',
            registrationNumber: '',
            vatNumber: '',
            industry: company.industry || '',
            website: company.contact?.website || '',
            phone: company.contact?.phone || '',
            email: company.contact?.email || '',
            address: company.contact?.address || '',
            country: company.headquarters?.split(', ').pop() || '',
            primaryContact: {
              name: '',
              position: '',
              email: company.contact?.email || '',
              phone: company.contact?.phone || ''
            },
            billingContact: {
              name: '',
              position: '',
              email: company.contact?.email || '',
              phone: company.contact?.phone || ''
            },
            technicalContact: {
              name: '',
              position: '',
              email: company.contact?.email || '',
              phone: company.contact?.phone || ''
            }
          });
        }
      } catch (err) {
        setError('Failed to fetch company data');
        console.error('Error fetching company data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, contactType?: 'primaryContact' | 'billingContact' | 'technicalContact', field?: keyof ContactInfo) => {
    if (contactType && field) {
      setFormData({
        ...formData,
        [contactType]: {
          ...formData[contactType],
          [field]: e.target.value
        }
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const ContactForm = ({ type, data }: { type: string, data: any }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{type} Contact</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleInputChange(e, type.toLowerCase() + 'Contact' as 'primaryContact' | 'billingContact' | 'technicalContact', 'name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Position</label>
          <input
            type="text"
            value={data.position}
            onChange={(e) => handleInputChange(e, type.toLowerCase() + 'Contact' as 'primaryContact' | 'billingContact' | 'technicalContact', 'position')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleInputChange(e, type.toLowerCase() + 'Contact' as 'primaryContact' | 'billingContact' | 'technicalContact', 'email')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => handleInputChange(e, type.toLowerCase() + 'Contact' as 'primaryContact' | 'billingContact' | 'technicalContact', 'phone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company Profile</h2>
          <p className="text-sm text-gray-500">Enter your company's details to get started</p>
        </div>
        <button
          type="submit"
          form="company-profile-form"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Save & Continue'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading company data...</p>
          </div>
        </div>
      ) : (
        <form id="company-profile-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <FileText className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">VAT Number</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Globe className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-6 text-lg font-medium text-gray-900">Contact Information</h3>
            <div className="space-y-8">
              <ContactForm type="Primary" data={formData.primaryContact} />
              <ContactForm type="Billing" data={formData.billingContact} />
              <ContactForm type="Technical" data={formData.technicalContact} />
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Terms and Conditions</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    I agree to the Terms and Conditions
                  </label>
                  <p className="text-gray-500">
                    By checking this box, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="marketing"
                    name="marketing"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="marketing" className="font-medium text-gray-700">
                    Marketing Communications
                  </label>
                  <p className="text-gray-500">
                    I want to receive updates about products, features and releases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CompanyProfile;