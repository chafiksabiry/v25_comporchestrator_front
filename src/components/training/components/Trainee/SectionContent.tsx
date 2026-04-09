import React from 'react';
import { FileText, Play, Maximize, CheckCircle } from 'lucide-react';
import { TrainingModule } from '../../types';
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import PresentationPreview from '../Training/PresentationPreview';
import { mapModuleToPresentation } from '../../utils/PresentationMapper';

interface SectionContentProps {
  module: TrainingModule;
  currentSection: number;
  currentSectionData: any;
  sections: any[];
  sectionTitles: string[];
  fileTrainingUrl?: string;
  onComplete: () => void;
  handleSectionComplete: () => void;
}

export const SectionContent: React.FC<SectionContentProps> = ({
  module,
  currentSection,
  currentSectionData,
  sections,
  sectionTitles,
  fileTrainingUrl,
  onComplete,
  handleSectionComplete
}) => {
  return (
    <>
      {/* PPTX Presentation Viewer (Primary Content) */}
      {fileTrainingUrl ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-gray-900">Présentation Interactive (PPTX)</h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Source: AI Generated
              </span>
              <button
                onClick={() => {
                  const el = document.getElementById('presentation-viewer');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs px-3 py-1 bg-[var(--primary-color,#2563eb)] text-white rounded-full hover:opacity-90 transition-colors font-medium flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Aller à la Présentation</span>
              </button>
              <a
                href={fileTrainingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors font-medium flex items-center space-x-1"
              >
                <Maximize className="h-3 w-3" />
                <span>Plein écran</span>
              </a>
            </div>
          </div>
          <div id="presentation-viewer" className="relative w-full bg-gray-50 flex flex-col" style={{ height: '750px' }}>
            <PresentationPreview
              presentation={mapModuleToPresentation(module as any)}
              onClose={() => {}}
              isEmbedded={true}
              showPagination={true}
              onSave={onComplete}
              isSaving={false}
            />
          </div>
        </div>
      ) : null}

      {/* Content Player - Display section content (Fallback or if no PPTX) */}
      {(!fileTrainingUrl && sections.length > 0 && currentSectionData) ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex flex-col" style={{ minHeight: '600px' }}>
            {/* Section Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50" style={{ background: 'linear-gradient(to right, var(--primary-color)10, var(--secondary-color)10)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Section {currentSection + 1}: {currentSectionData.title || sectionTitles[currentSection] || 'Untitled Section'}
                  </h2>
                  {currentSectionData.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentSectionData.description}</p>
                  )}
                </div>
                <button
                  onClick={handleSectionComplete}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Mark Complete</span>
                </button>
              </div>
            </div>

            {/* Section Content */}
            <div className="flex-1 min-h-0 overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Section Image */}
              {currentSectionData.imageUrl && (
                <div className="px-6 pt-6">
                  <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100 max-h-80 flex items-center justify-center bg-gray-50">
                    <img
                      src={currentSectionData.imageUrl}
                      alt={currentSectionData.imageDescription || 'Section visual'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {currentSectionData.imageDescription && (
                    <p className="text-xs text-gray-500 mt-2 text-center italic">{currentSectionData.imageDescription}</p>
                  )}
                </div>
              )}

              {currentSectionData.content?.file?.url ? (
                <DocumentViewer
                  fileUrl={currentSectionData.content.file.url}
                  fileName={currentSectionData.content.file.name || currentSectionData.title}
                  mimeType={currentSectionData.content.file.mimeType}
                />
              ) : currentSectionData.content?.text ? (
                <div className="p-6 flex-1 overflow-y-auto" style={{ overflowY: 'auto', height: '100%' }}>
                  <div className="prose max-w-none">
                    {currentSectionData.content.text.split('\n\n').map((paragraph: string, idx: number) => (
                      <p key={idx} className="text-gray-700 text-base leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No content available for this section</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
