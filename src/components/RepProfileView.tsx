import React, { useState } from 'react';
import { X, MapPin, Mail, Phone, Target, Briefcase, Calendar, Clock, ChevronLeft } from 'lucide-react';

interface RepProfileViewProps {
    profile: any;
    onClose: () => void;
}

export const RepProfileView: React.FC<RepProfileViewProps> = ({ profile, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');

    if (!profile) return null;

    const calculateOverallScore = () => {
        if (!profile.skills?.contactCenter?.length || !profile.skills.contactCenter[0]?.assessmentResults?.keyMetrics) return 'N/A';
        const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
        return Math.floor((professionalism + effectiveness + customerFocus) / 3);
    };

    const getCountryDisplayName = () => {
        const country = profile.personalInfo?.country;
        if (country) {
            if (typeof country === 'string') return country;
            if (typeof country === 'object') {
                if (country.countryName) return country.countryName;
                if (country.zoneName) return country.zoneName;
            }
        }
        
        // Fallback to flat structure or timezone
        if (profile.timezone?.countryName) return profile.timezone.countryName;
        if (profile.location) return profile.location;
        if (profile.country) {
            if (typeof profile.country === 'string') return profile.country;
            if (typeof profile.country === 'object' && profile.country.countryName) return profile.country.countryName;
        }
        
        return 'Not specified';
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* About Section */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">About</h2>
                            </div>
                            <div>
                                {profile.professionalSummary?.profileDescription ? (
                                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.professionalSummary.profileDescription}</p>
                                ) : (
                                    <p className="text-slate-500 italic">No professional summary provided</p>
                                )}
                            </div>
                        </div>

                        {/* Introduction Video Section */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Introduction Video</h3>
                            {profile.personalInfo?.presentationVideo?.url ? (
                                <div className="space-y-4">
                                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
                                        <video controls className="aspect-video w-full object-cover">
                                            <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>

                                    <div className="flex flex-wrap gap-6 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 backdrop-blur-sm">
                                        {profile.personalInfo.presentationVideo.duration && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Clock className="w-4 h-4 text-harx-400" />
                                                <span>{Math.floor(profile.personalInfo.presentationVideo.duration)}s</span>
                                            </div>
                                        )}
                                        {profile.personalInfo.presentationVideo.recordedAt && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar className="w-4 h-4 text-harx-400" />
                                                <span>Recorded {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-white p-4 text-sm text-amber-900 shadow-sm">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg" aria-hidden>
                                        🎥
                                    </span>
                                    <p className="pt-1 leading-relaxed">
                                        No video introduction provided by the representative.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'skills':
                return (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black text-gray-900 mb-4">Skills</h2>
                        <p className="text-slate-500 italic">Skills details are not available in this view.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-[#f8fafc] w-full h-full overflow-y-auto rounded-3xl relative border border-gray-100">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm border border-gray-100 transition-colors z-10"
            >
                <X size={20} />
            </button>

            <div className="px-6 py-6 lg:px-10 lg:py-8 space-y-6">
                {/* Header */}
                <div>
                    <button
                        onClick={onClose}
                        className="flex items-center text-harx-500 hover:text-harx-600 font-medium mb-4 transition-colors"
                    >
                        <ChevronLeft size={20} className="mr-1" />
                        <span>Back</span>
                    </button>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">
                        Representative Profile
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">
                        View details and background
                    </p>
                </div>

                {/* Navbar */}
                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        className={`py-2 px-4 font-bold text-sm transition-colors ${activeTab === 'profile' ? 'border-b-2 border-harx-500 text-harx-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile
                    </button>
                    <button
                        className={`py-2 px-4 font-bold text-sm transition-colors ${activeTab === 'skills' ? 'border-b-2 border-harx-500 text-harx-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('skills')}
                    >
                        Skills
                    </button>
                </div>

                {/* Identity Section */}
                {activeTab === 'profile' && (
                    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Photo */}
                            <div className="w-32 h-32 rounded-[24px] shadow-lg border-4 border-white bg-slate-200/50 overflow-hidden shrink-0">
                                {profile.personalInfo?.photo?.url || profile.photo?.url || profile.photo ? (
                                    <img
                                        src={profile.personalInfo?.photo?.url || profile.photo?.url || profile.photo}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300 bg-gray-50 uppercase">
                                        {profile.personalInfo?.name?.charAt(0) || profile.name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 w-full">
                                <div className="mb-4">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{profile.personalInfo?.name || profile.name}</h2>
                                    <p className="text-sm font-bold text-harx-500 uppercase tracking-widest italic">{profile.professionalSummary?.currentRole || profile.currentRole || 'Representative'}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Location */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                                        <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-xl border border-gray-100">
                                            <MapPin className="w-3.5 h-3.5 text-harx-400" />
                                            <span className="text-sm font-bold text-slate-900">{getCountryDisplayName()}</span>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                        <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-xl border border-gray-100">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-900 truncate">{profile.personalInfo?.email || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                                        <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-xl border border-gray-100">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-900">{profile.personalInfo?.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-harx-500">
                                            <Target size={20} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-harx-400 uppercase tracking-widest">REPS Score</div>
                                            <div className="text-xl font-black text-harx-900 tracking-tighter leading-none mt-0.5">{calculateOverallScore()} / 100</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status</div>
                                            <div className="text-xl font-black text-emerald-900 tracking-tighter leading-none mt-0.5">
                                                {profile.status === 'completed' ? 'Verified' : 'Pending'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="mt-6">
                    {renderActiveTab()}
                </div>
            </div>
        </div>
    );
};

export default RepProfileView;
