import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Share2
} from 'lucide-react';

const KnowledgeBase = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('product');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      id: 'product',
      title: 'Product Information',
      articles: [
        {
          id: 1,
          title: 'Product Overview',
          content: 'Comprehensive overview of our product features and benefits...',
          lastUpdated: '2 days ago',
          status: 'published'
        },
        {
          id: 2,
          title: 'Technical Specifications',
          content: 'Detailed technical specifications and requirements...',
          lastUpdated: '1 week ago',
          status: 'draft'
        }
      ]
    },
    {
      id: 'objections',
      title: 'Common Objections',
      articles: [
        {
          id: 3,
          title: 'Price Concerns',
          content: 'How to handle pricing objections and demonstrate value...',
          lastUpdated: '3 days ago',
          status: 'published'
        },
        {
          id: 4,
          title: 'Competition Comparison',
          content: 'Key differentiators from competitors...',
          lastUpdated: '5 days ago',
          status: 'published'
        }
      ]
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      articles: [
        {
          id: 5,
          title: 'General FAQs',
          content: 'Common questions about our services...',
          lastUpdated: '1 day ago',
          status: 'published'
        },
        {
          id: 6,
          title: 'Technical FAQs',
          content: 'Technical support and troubleshooting questions...',
          lastUpdated: '4 days ago',
          status: 'published'
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
          <p className="text-sm text-gray-500">Create and manage training materials for REPS</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Section
          </button>
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <select className="rounded-lg border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500">
          <option>All Categories</option>
          <option>Product Information</option>
          <option>Common Objections</option>
          <option>FAQs</option>
        </select>
      </div>

      {/* Knowledge Base Content */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg bg-white shadow">
            <div
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.articles.length} articles</p>
                </div>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>

            {expandedSection === section.id && (
              <div className="border-t border-gray-200">
                {section.articles.map((article) => (
                  <div
                    key={article.id}
                    className="border-b border-gray-200 p-4 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <FileText className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">{article.title}</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {article.content.substring(0, 100)}...
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Last updated {article.lastUpdated}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                article.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {article.status === 'published' ? (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <AlertCircle className="mr-1 h-3 w-3" />
                              )}
                              {article.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 p-4">
                  <button className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Article to {section.title}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="rounded-lg bg-indigo-50 p-6">
        <h3 className="text-lg font-medium text-indigo-900">Knowledge Base Best Practices</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-green-100 p-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Keep It Updated</h4>
                <p className="text-sm text-gray-500">
                  Regularly review and update content to ensure accuracy
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Clear Communication</h4>
                <p className="text-sm text-gray-500">
                  Use simple language and provide examples
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Easy Access</h4>
                <p className="text-sm text-gray-500">
                  Organize content logically for quick reference
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;