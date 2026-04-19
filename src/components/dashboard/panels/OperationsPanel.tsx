import React, { useState } from 'react';
import {
  BookOpen,
  Phone,
  GraduationCap,
  ScrollText,
  Search,
  Plus,
  FileText,
  Folder,
  PhoneCall,
  Video,
  BookMarked,
  Award,
  CheckCircle2,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface Script {
  id: string;
  title: string;
  category: string;
  version: string;
  lastUpdated: string;
  status: 'active' | 'draft' | 'archived';
}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  views: number;
  lastUpdated: string;
  status: 'published' | 'draft' | 'review';
}

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  completions: number;
  status: 'active' | 'draft' | 'archived';
}

const mockScripts: Script[] = [
  {
    id: '1',
    title: 'Customer Greeting Protocol',
    category: 'General',
    version: '2.1',
    lastUpdated: '2024-01-29',
    status: 'active'
  },
  {
    id: '2',
    title: 'Technical Support Workflow',
    category: 'Support',
    version: '1.5',
    lastUpdated: '2024-01-28',
    status: 'active'
  }
];

const mockArticles: KnowledgeArticle[] = [
  {
    id: '1',
    title: 'Common Technical Issues Guide',
    category: 'Technical',
    views: 1250,
    lastUpdated: '2024-01-29',
    status: 'published'
  },
  {
    id: '2',
    title: 'Customer Service Best Practices',
    category: 'Service',
    views: 890,
    lastUpdated: '2024-01-28',
    status: 'published'
  }
];

const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Customer Service Fundamentals',
    category: 'Onboarding',
    duration: '4 hours',
    completions: 156,
    status: 'active'
  },
  {
    id: '2',
    title: 'Advanced Communication Skills',
    category: 'Professional Development',
    duration: '6 hours',
    completions: 89,
    status: 'active'
  }
];

function OperationsPanel() {
  const [activeTab, setActiveTab] = useState<'scripts' | 'knowledge' | 'telephony' | 'lms'>('scripts');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-600';
      case 'draft':
        return 'bg-yellow-100 text-yellow-600';
      case 'archived':
      case 'review':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <ScrollText className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold">Operations Center</h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Active Scripts</span>
            </div>
            <div className="text-2xl font-bold">24</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              8% increase
            </div>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-rose-500" />
              <span className="font-medium">Knowledge Base</span>
            </div>
            <div className="text-2xl font-bold">156</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              12% increase
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="font-medium">Active Calls</span>
            </div>
            <div className="text-2xl font-bold">32</div>
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              5% decrease
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-orange-600" />
              <span className="font-medium">Training Progress</span>
            </div>
            <div className="text-2xl font-bold">92%</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              3% increase
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'scripts'
                ? 'border-rose-500 text-rose-500'
                : 'border-transparent text-gray-600 hover:text-rose-500'
            }`}
          >
            Scripts
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'knowledge'
                ? 'border-rose-500 text-rose-500'
                : 'border-transparent text-gray-600 hover:text-rose-500'
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('telephony')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'telephony'
                ? 'border-rose-500 text-rose-500'
                : 'border-transparent text-gray-600 hover:text-rose-500'
            }`}
          >
            Telephony
          </button>
          <button
            onClick={() => setActiveTab('lms')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'lms'
                ? 'border-rose-500 text-rose-500'
                : 'border-transparent text-gray-600 hover:text-rose-500'
            }`}
          >
            Learning Management
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          <button className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New
          </button>
        </div>

        {activeTab === 'scripts' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Version</th>
                  <th className="pb-3">Last Updated</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockScripts.map((script) => (
                  <tr key={script.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span>{script.title}</span>
                      </div>
                    </td>
                    <td className="py-3">{script.category}</td>
                    <td className="py-3">{script.version}</td>
                    <td className="py-3">{script.lastUpdated}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(script.status)}`}>
                        {script.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Download className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Views</th>
                  <th className="pb-3">Last Updated</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <BookMarked className="w-5 h-5 text-gray-400" />
                        <span>{article.title}</span>
                      </div>
                    </td>
                    <td className="py-3">{article.category}</td>
                    <td className="py-3">{article.views}</td>
                    <td className="py-3">{article.lastUpdated}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(article.status)}`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'telephony' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Phone System</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Active Lines</span>
                  <span className="font-medium">24/50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Queue Size</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avg Wait Time</span>
                  <span className="font-medium">2m 30s</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Call Routing</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>IVR Active</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Skills-based Routing</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Queue Priority</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Call Analytics</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Recording Active</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Quality Monitoring</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Real-time Analytics</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lms' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3">Course</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Completions</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                        <span>{course.title}</span>
                      </div>
                    </td>
                    <td className="py-3">{course.category}</td>
                    <td className="py-3">{course.duration}</td>
                    <td className="py-3">{course.completions}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(course.status)}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperationsPanel;
