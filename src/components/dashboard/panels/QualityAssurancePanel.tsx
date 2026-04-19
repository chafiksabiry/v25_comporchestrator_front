import React, { useState } from 'react';
import {
  ClipboardCheck,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Shield,
  Headphones,
  ListChecks
} from 'lucide-react';

interface QAScore {
  id: string;
  agentName: string;
  agentImage: string;
  interactionType: 'call' | 'email' | 'chat';
  score: number;
  date: string;
  status: 'passed' | 'failed' | 'review';
  criteria: {
    category: string;
    score: number;
    maxScore: number;
  }[];
  notes: string;
}

const mockScores: QAScore[] = [
  {
    id: '1',
    agentName: 'Sarah Johnson',
    agentImage: 'https://i.pravatar.cc/150?img=1',
    interactionType: 'call',
    score: 92,
    date: '2024-01-29',
    status: 'passed',
    criteria: [
      { category: 'Greeting', score: 9, maxScore: 10 },
      { category: 'Problem Resolution', score: 18, maxScore: 20 },
      { category: 'Communication', score: 28, maxScore: 30 },
      { category: 'Compliance', score: 37, maxScore: 40 }
    ],
    notes: 'Excellent customer handling and problem resolution'
  },
  {
    id: '2',
    agentName: 'Michael Chen',
    agentImage: 'https://i.pravatar.cc/150?img=2',
    interactionType: 'email',
    score: 85,
    date: '2024-01-28',
    status: 'passed',
    criteria: [
      { category: 'Greeting', score: 8, maxScore: 10 },
      { category: 'Problem Resolution', score: 17, maxScore: 20 },
      { category: 'Communication', score: 25, maxScore: 30 },
      { category: 'Compliance', score: 35, maxScore: 40 }
    ],
    notes: 'Good response time, could improve on solution clarity'
  },
  {
    id: '3',
    agentName: 'Emily Rodriguez',
    agentImage: 'https://i.pravatar.cc/150?img=3',
    interactionType: 'chat',
    score: 78,
    date: '2024-01-27',
    status: 'review',
    criteria: [
      { category: 'Greeting', score: 7, maxScore: 10 },
      { category: 'Problem Resolution', score: 15, maxScore: 20 },
      { category: 'Communication', score: 24, maxScore: 30 },
      { category: 'Compliance', score: 32, maxScore: 40 }
    ],
    notes: 'Needs improvement in response time and follow-up'
  }
];

function QualityAssurancePanel() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScore, setSelectedScore] = useState<QAScore | null>(null);

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-600';
      case 'failed':
        return 'bg-red-100 text-red-600';
      case 'review':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-rose-500';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">Quality Assurance</h2>
          </div>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            New Evaluation
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium">Pass Rate</span>
            </div>
            <div className="text-2xl font-bold">92%</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              5% increase
            </div>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-rose-500" />
              <span className="font-medium">Evaluations</span>
            </div>
            <div className="text-2xl font-bold">248</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              12% increase
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Compliance</span>
            </div>
            <div className="text-2xl font-bold">96%</div>
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              2% decrease
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Avg Score</span>
            </div>
            <div className="text-2xl font-bold">88%</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              3% increase
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search evaluations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex gap-2">
            {['all', 'passed', 'failed', 'review'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg ${
                  activeFilter === filter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">Agent</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Notes</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockScores.map((score) => (
                <tr key={score.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={score.agentImage}
                        alt={score.agentName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{score.agentName}</div>
                        <div className="text-sm text-gray-500">Agent ID: {score.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {getInteractionIcon(score.interactionType)}
                      <span className="capitalize">{score.interactionType}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className={`font-bold ${getScoreColor(score.score)}`}>
                      {score.score}%
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {score.date}
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                        score.status
                      )}`}
                    >
                      {score.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {score.notes}
                    </p>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedScore(score)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="View Details"
                      >
                        <ListChecks className="w-5 h-5 text-rose-500" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Listen to Recording"
                      >
                        <Headphones className="w-5 h-5 text-purple-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Flag for Review"
                      >
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={selectedScore.agentImage}
                  alt={selectedScore.agentName}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold">{selectedScore.agentName}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedScore.date} - {selectedScore.interactionType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScore(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Evaluation Criteria</h4>
                <div className="space-y-3">
                  {selectedScore.criteria.map((criterion) => (
                    <div key={criterion.category} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{criterion.category}</span>
                        <span className={getScoreColor((criterion.score / criterion.maxScore) * 100)}>
                          {criterion.score}/{criterion.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-600 rounded-full h-2"
                          style={{
                            width: `${(criterion.score / criterion.maxScore) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedScore.notes}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedScore(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Update Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QualityAssurancePanel;
