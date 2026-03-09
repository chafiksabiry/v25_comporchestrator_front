import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Database, 
  Code, 
  Package, 
  Server, 
  Cloud, 
  CheckCircle,
  Loader2,
  X,
  Archive,
  Settings,
  Globe
} from 'lucide-react';
import { ExportService } from '../../lib/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportOptions = [
    {
      id: 'full-project',
      title: 'Complete Project Export',
      description: 'Export entire codebase with clean architecture, documentation, and setup files',
      icon: Package,
      color: 'from-blue-500 to-indigo-500',
      includes: ['Source code', 'Documentation', 'Docker setup', 'Database schemas', 'Configuration files'],
      action: () => ExportService.exportProject()
    },
    {
      id: 'source-code',
      title: 'Source Code Only',
      description: 'Export just the application source code with clean architecture structure',
      icon: Code,
      color: 'from-green-500 to-emerald-500',
      includes: ['TypeScript/React code', 'Clean architecture layers', 'Component library', 'Custom hooks'],
      action: () => ExportService.exportProject()
    },
    {
      id: 'training-data',
      title: 'Training Data Export',
      description: 'Export all training content, progress data, and user information',
      icon: Database,
      color: 'from-purple-500 to-pink-500',
      includes: ['Training journeys', 'Module content', 'User progress', 'Assessment results'],
      action: () => ExportService.exportTrainingData()
    },
    {
      id: 'docker-setup',
      title: 'Docker Deployment',
      description: 'Export Docker containers and deployment configuration',
      icon: Server,
      color: 'from-orange-500 to-red-500',
      includes: ['Docker Compose', 'Dockerfiles', 'Nginx config', 'Deploy scripts'],
      action: () => ExportService.exportDockerSetup()
    },
    {
      id: 'database-schema',
      title: 'Database Schema',
      description: 'Export MongoDB collections, indexes, and relationships',
      icon: Database,
      color: 'from-cyan-500 to-blue-500',
      includes: ['Collection schemas', 'Index definitions', 'Relationships', 'Migration scripts'],
      action: () => ExportService.exportDatabaseSchema()
    },
    {
      id: 'api-docs',
      title: 'API Documentation',
      description: 'Export complete API documentation and integration guides',
      icon: FileText,
      color: 'from-teal-500 to-green-500',
      includes: ['REST API docs', 'Authentication guide', 'Integration examples', 'Postman collection'],
      action: () => ExportService.exportProject()
    }
  ];

  const handleExport = async (option: typeof exportOptions[0]) => {
    setIsExporting(true);
    setExportType(option.id);
    
    try {
      await option.action();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Export Training Platform</h2>
              <p className="text-gray-600">Choose what you'd like to export from your training platform</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isCurrentlyExporting = isExporting && exportType === option.id;
              
              return (
                <div
                  key={option.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                    <p className="text-gray-600 text-sm">{option.description}</p>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Includes:</h4>
                    <ul className="space-y-1">
                      {option.includes.map((item, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleExport(option)}
                    disabled={isExporting}
                    className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                      isCurrentlyExporting
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gradient-to-r ' + option.color + ' text-white hover:shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isCurrentlyExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Export Actions */}
          <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport(exportOptions[0])}
                disabled={isExporting}
                className="flex items-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Archive className="h-5 w-5" />
                <span>Export Everything</span>
              </button>
              
              <button
                onClick={() => window.open('https://github.com/your-repo/training-platform', '_blank')}
                className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Code className="h-5 w-5" />
                <span>View on GitHub</span>
              </button>
              
              <button
                onClick={() => window.open(window.location.origin, '_blank')}
                className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-5 w-5" />
                <span>Live Demo</span>
              </button>
            </div>
          </div>

          {/* Export Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 mb-3">📋 Export Instructions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
              <div>
                <h5 className="font-medium mb-2">For Development:</h5>
                <ul className="space-y-1">
                  <li>• Export "Complete Project" for full setup</li>
                  <li>• Use Docker export for easy deployment</li>
                  <li>• Export source code for customization</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">For Production:</h5>
                <ul className="space-y-1">
                  <li>• Use Docker deployment for scalability</li>
                  <li>• Export training data for backups</li>
                  <li>• Get API docs for integrations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}