import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const GigGeneration = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [gigs, setGigs] = useState([
    { id: 1, title: 'Web Development Project', client: 'XYZ Corp', budget: '$2,500', status: 'Published', matches: 8 },
    { id: 2, title: 'Digital Marketing Campaign', client: 'ABC Inc', budget: '$1,800', status: 'Draft', matches: 0 },
    { id: 3, title: 'Mobile App Development', client: 'Tech Startup', budget: '$5,000', status: 'Published', matches: 12 },
    { id: 4, title: 'Content Creation for Blog', client: 'Marketing Agency', budget: '$800', status: 'Pending Approval', matches: 0 },
    { id: 5, title: 'UI/UX Design for Website', client: 'E-commerce Store', budget: '$1,200', status: 'Published', matches: 5 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gig Generation</h1>
        <button className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          <Plus className="h-5 w-5" />
          <span>New Gig</span>
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex space-x-4 border-b border-gray-200">
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create Gig
          </button>
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'optimize'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('optimize')}
          >
            Optimize Existing
          </button>
          <button
            className={`border-b-2 px-4 py-2 font-medium ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
        </div>

        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-indigo-50 p-4 text-indigo-700">
              <div className="flex items-start">
                <Sparkles className="mr-2 h-5 w-5 flex-shrink-0" />
                <p className="text-sm">
                  The AI will help you create an optimized gig description based on your requirements. 
                  Fill in the details below or use our quick-start templates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gig Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Web Development Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client/Company</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., XYZ Corporation"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gig Description</label>
              <textarea
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Describe the project, requirements, and desired outcomes..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="1000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    className="block w-full flex-1 rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="2"
                  />
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    weeks
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Required Skills</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., JavaScript, React, Node.js"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Optimization Level</label>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                  <input
                    type="radio"
                    name="optimization"
                    value="basic"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    defaultChecked
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Basic</span>
                    <span className="block text-xs text-gray-500">Grammar & clarity checks</span>
                  </div>
                </div>
                <div className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                  <input
                    type="radio"
                    name="optimization"
                    value="standard"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Standard</span>
                    <span className="block text-xs text-gray-500">+ Keyword optimization</span>
                  </div>
                </div>
                <div className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                  <input
                    type="radio"
                    name="optimization"
                    value="premium"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Premium</span>
                    <span className="block text-xs text-gray-500">+ Conversion optimization</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                Save as Draft
              </button>
              <button className="rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                Generate & Preview
              </button>
            </div>
          </div>
        )}

        {activeTab === 'optimize' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Gig to Optimize</label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <div className="relative flex flex-grow items-stretch">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Search by title or client..."
                  />
                </div>
                <button className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Search
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Digital Marketing Campaign</h3>
                  <p className="text-sm text-gray-500">Client: ABC Inc</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  Draft
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-700">
                  Looking for a digital marketing expert to help with our new product launch. Need someone with experience in social media marketing, email campaigns, and PPC advertising.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-xs text-gray-500">Budget:</span>
                    <span className="ml-1 text-sm font-medium text-gray-900">$1,800</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Duration:</span>
                    <span className="ml-1 text-sm font-medium text-gray-900">3 weeks</span>
                  </div>
                </div>
                <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                  <Sparkles className="mr-1 h-4 w-4" />
                  Optimize
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-indigo-50 p-4">
              <h3 className="text-sm font-medium text-indigo-900">AI Optimization Suggestions</h3>
              <ul className="mt-2 space-y-2">
                <li className="flex items-start">
                  <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700">Add specific KPIs and success metrics to attract qualified candidates</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700">Include information about target audience and platforms</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700">Specify required reporting frequency and format</span>
                </li>
              </ul>
              <button className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Apply All Suggestions
              </button>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Web Development', description: 'For website creation, maintenance, or redesign projects', skills: ['HTML/CSS', 'JavaScript', 'React'] },
                { title: 'Digital Marketing', description: 'For social media, email, and advertising campaigns', skills: ['Social Media', 'SEO', 'Content'] },
                { title: 'Mobile App Development', description: 'For iOS and Android application projects', skills: ['Swift', 'Kotlin', 'React Native'] },
                { title: 'UI/UX Design', description: 'For user interface and experience design projects', skills: ['Figma', 'User Research', 'Prototyping'] },
                { title: 'Content Creation', description: 'For blog posts, articles, and copywriting', skills: ['Writing', 'Editing', 'SEO'] },
                { title: 'Data Analysis', description: 'For data processing and insights generation', skills: ['SQL', 'Python', 'Visualization'] },
              ].map((template, index) => (
                <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md">
                  <h3 className="text-lg font-medium text-gray-900">{template.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.skills.map((skill, skillIndex) => (
                      <span key={skillIndex} className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <button className="mt-4 w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing Gigs */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Existing Gigs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Budget
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Matches
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {gigs.map((gig) => (
                <tr key={gig.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{gig.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {gig.client}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {gig.budget}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {gig.status === 'Published' ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Published
                      </span>
                    ) : gig.status === 'Draft' ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        <Edit className="mr-1 h-3 w-3" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {gig.matches > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                        {gig.matches} matches
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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

export default GigGeneration;