import React, { useEffect, useState } from 'react';
import { Award, CheckCircle, Download, Share2, ArrowRight, Star, Shield, Trophy } from 'lucide-react';
import { Rep, TrainingJourney } from '../../types';

interface CertificationViewProps {
  trainee: Rep;
  journey: TrainingJourney;
  onBack: () => void;
}

export default function CertificationView({ trainee, journey, onBack }: CertificationViewProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const completionDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 p-12 relative z-10 text-center transform transition-all duration-700 hover:scale-[1.01]">
        {/* Certificate Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-amber-400/20 rounded-full filter blur-2xl animate-pulse"></div>
          </div>
          <img 
            src="/certification-badge.png" 
            alt="Certification Badge" 
            className="w-48 h-48 mx-auto relative z-10 drop-shadow-2xl animate-float"
          />
        </div>

        {/* Certificate Body */}
        <div className="space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-bold tracking-wide uppercase border border-amber-100 mb-2">
            <Star className="w-4 h-4 fill-amber-500" />
            <span>Félicitations ! Vous êtes certifié</span>
            <Star className="w-4 h-4 fill-amber-500" />
          </div>

          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
            Certificat de Réussite
          </h1>

          <div className="py-8">
            <p className="text-xl text-slate-500 font-medium mb-2">Décerné à</p>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 py-2">
              {trainee.name}
            </h2>
          </div>

          <div className="max-w-2xl mx-auto p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <p className="text-lg text-slate-600 mb-4">
              Pour avoir complété avec succès le parcours de formation :
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {journey.name}
            </h3>
            <p className="text-slate-500 italic">
              Validé le {completionDate}
            </p>
          </div>
        </div>

        {/* Certificate Footer / Actions */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg group">
            <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            <span>Télécharger mon Certificat</span>
          </button>
          
          <button className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-lg">
            <Share2 className="w-5 h-5" />
            <span>Partager mon succès</span>
          </button>
        </div>

        <button 
          onClick={onBack}
          className="mt-8 text-slate-400 hover:text-slate-600 font-medium flex items-center justify-center mx-auto transition-colors"
        >
          <span>Retour au Dashboard</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}
