import React, { useState } from 'react';
import { 
  UserCircle, 
  Plus, 
  Search, 
  Upload, 
  Edit, 
  Trash2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ProfileCreation = () => {
  const [activeTab, setActiveTab] = useState('automatic');
  const [profiles, setProfiles] = useState([
    { id: 1, name: 'John Smith', skills: ['Web Development', 'UI/UX Design'], status: 'Complete', successRate: '95%' },
    { id: 2, name: 'Sarah Johnson', skills: ['Digital Marketing', 'Content Creation'], status: 'Incomplete', successRate: '87%' },
    { id: 3, name: 'Michael Brown', skills: ['Project Management', 'Agile'], status: 'Complete', successRate: '92%' },
    { id: 4, name: 'Emily Davis', skills: ['Data Analysis', 'Machine Learning'], status: 'Complete', successRate: '89%' },
    { id: 5, name: 'David Wilson', skills: ['Mobile Development', 'React Native'], status: 'Incomplete', successRate: '78%' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profile Creation</h1>
        <button className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          <Plus className="h-5 w-5" />
          <span>New Profile</span>
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex space-x-4 border-b border-gray-200">
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'automatic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('automatic')}
          >
            Automatic Generation
          </button>
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Creation
          </button>
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import Profiles
          </button>
        </div>

        {activeTab === 'automatic' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-indigo-50 p-4 text-indigo-700">
              <p className="text-sm">
                The AI will automatically generate detailed profiles based on available data sources. You can review and customize the generated profiles before finalizing.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Sources</label>
                <div className="mt-2 space-y-2">
                  {['LinkedIn Profiles', 'Resume Database', 'Previous Performance Data', 'Skills Assessment'].map((source, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`source-${index}`}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        defaultChecked
                      />
                      <label htmlFor={`source-${index}`} className="ml-2 text-sm text-gray-700">
                        {source}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Profile Depth</label>
                <select className="mt-2 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                  <option>Basic (Skills & Experience)</option>
                  <option>Standard (+ Performance Metrics)</option>
                  <option>Comprehensive (+ Success Patterns)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Search for Existing Profiles</label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <div className="relative flex flex-grow items-stretch">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Search by name, skills, or experience..."
                  />
                </div>
                <button className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Search
                </button>
              </div>
            </div>

            <button className="w-full rounded-md bg-indigo-600 py-2 px-4 text-white hover:bg-indigo-700">
              Generate Profiles
            </button>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="john.smith@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Web Development, UI/UX Design, JavaScript, React"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Experience</label>
              <textarea
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Describe professional experience..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="75"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Availability</label>
                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Weekends only</option>
                  <option>Evenings only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                Cancel
              </button>
              <button className="rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                Create Profile
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <div className="flex justify-center">
                <Upload className="h-12 w-12 text-gray-400" />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">
                Drag and drop CSV or Excel files
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Or click to browse from your computer
              </p>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                accept=".csv, .xlsx, .xls"
              />
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                Select Files
              </button>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-900">Import Guidelines</h3>
              <ul className="mt-2 list-disc pl-5 text-xs text-gray-500">
                <li>Use our template for best results</li>
                <li>CSV or Excel files only</li>
                <li>Maximum 100 profiles per import</li>
                <li>Required fields: Name, Email, Skills</li>
                <li>Optional fields will be generated by AI if missing</li>
              </ul>
              <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                Download Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Profiles */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Existing Profiles</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Skills
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Success Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {profile.skills.map((skill, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {profile.status === 'Complete' ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Incomplete
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {profile.successRate}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button className="mr-2 text-indigo-600 hover:text-indigo-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfileCreation;