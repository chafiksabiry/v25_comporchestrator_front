import React, { useState } from 'react';
import { X, FileText, Sparkles } from 'lucide-react';

interface InteractivePresentationViewerProps {
  presentation: any;
  onClose: () => void;
  onDownload: () => void;
  onApprove: () => void;
}

export default function InteractivePresentationViewer({
  presentation,
  onClose,
  onDownload,
  onApprove
}: InteractivePresentationViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slides = presentation?.slides || [];
  const totalSlides = slides.length;
  
  if (totalSlides === 0) {
    return (
      <div className="min-h-full bg-[#f1f5f9] p-8 flex flex-col items-center justify-center">
        <p className="text-xl text-slate-500">No slides generated yet.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg">Retour</button>
      </div>
    );
  }

  const slide = slides[currentSlideIndex] || {};

  const isCover = slide.type?.toLowerCase() === 'cover';
  const isConclusion = slide.type?.toLowerCase() === 'conclusion';
  let bgClasses = 'bg-white text-slate-800';
  if (isCover) bgClasses = 'bg-[#1e293b] text-white';
  if (isConclusion) bgClasses = 'bg-[#10b981] text-white';

  return (
    <div className="min-h-full bg-[#f1f5f9] p-8 flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <button 
          onClick={onClose}
          className="flex items-center text-slate-600 font-semibold hover:text-slate-900 transition-colors"
        >
          <X className="h-5 w-5 mr-1" /> Retour
        </button>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-slate-500">DIAPOSITIVE {currentSlideIndex + 1} / {totalSlides}</span>
          <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <button 
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex(prev => prev - 1)}
              className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
            >
              ←
            </button>
            <button 
              disabled={currentSlideIndex === totalSlides - 1}
              onClick={() => setCurrentSlideIndex(prev => prev + 1)}
              className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Slide Container (16:9 aspect ratio) */}
      <div className="w-full max-w-5xl aspect-[16/9] shadow-2xl rounded-lg overflow-hidden border-8 border-white bg-white relative">
        <div className={`w-full h-full ${bgClasses} transition-all duration-500 flex flex-col p-16 relative`}>
          
          {/* Cover Slide */}
          {isCover && (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-6xl font-extrabold mb-8 tracking-tight">{slide.title}</h1>
              <p className="text-2xl text-blue-100 max-w-3xl mb-12 leading-relaxed">{slide.subtitle || slide.highlight}</p>
            </div>
          )}
          
          {/* Conclusion Slide */}
          {isConclusion && (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
              <div className="h-32 w-32 rounded-full bg-white/20 flex items-center justify-center mb-10 shadow-lg">
                <Sparkles className="h-16 w-16 text-white" />
              </div>
              <h1 className="text-7xl font-black mb-8">{slide.title}</h1>
              <p className="text-3xl text-green-50 font-medium whitespace-pre-line leading-relaxed">{slide.content || slide.subtitle}</p>
            </div>
          )}

          {/* Regular Content Slide */}
          {!isCover && !isConclusion && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-12 animate-in slide-in-from-top-4 duration-500">
                <h2 className="text-4xl font-bold flex items-center w-full">
                  <span className="mr-4 text-5xl">{slide.icon || ''}</span> 
                  <span>{slide.title}</span>
                  <div className="flex-1 h-2 bg-slate-100 ml-6 rounded-full opacity-50"></div>
                </h2>
                {slide.highlight && (
                  <div className="ml-4 px-5 py-3 bg-yellow-50 text-yellow-800 rounded-xl text-lg font-bold border border-yellow-200 shadow-sm flex-shrink-0">
                    💡 {slide.highlight}
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                {slide.content && (
                  <p className="text-2xl text-slate-700 mb-10 leading-relaxed font-medium">
                    {slide.content}
                  </p>
                )}

                <div className="space-y-6">
                  {slide.bullets?.map((item: string, i: number) => (
                    <div 
                      key={i} 
                      className="flex items-start text-xl text-slate-600 animate-in slide-in-from-left duration-300 fill-mode-both" 
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <span className="h-3 w-3 rounded-full bg-blue-500 mr-4 mt-3 flex-shrink-0 shadow-sm"></span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Speaker Notes (Footer) */}
              {slide.note && (
                <div className="mt-8 pt-6 border-t-2 border-slate-100 text-slate-500 font-medium text-lg leading-relaxed bg-slate-50/50 p-4 rounded-lg">
                  <span className="font-bold text-slate-700 flex items-center mb-2">
                    <span className="mr-2">🎤</span> Speaker Note:
                  </span> 
                  {slide.note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex space-x-4">
         <button 
           onClick={onDownload}
           className="px-8 py-4 bg-white text-slate-800 rounded-2xl font-bold shadow-lg border border-slate-200 hover:bg-slate-50 hover:shadow-xl transition-all flex items-center"
         >
           <FileText className="mr-2 h-5 w-5 text-blue-600" />
           Télécharger le fichier .pptx
         </button>
         <button 
           onClick={onApprove}
           className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center text-lg"
         >
           <Sparkles className="h-6 w-6 mr-3" /> Terminer & Passer au Lancement
         </button>
      </div>
    </div>
  );
}
