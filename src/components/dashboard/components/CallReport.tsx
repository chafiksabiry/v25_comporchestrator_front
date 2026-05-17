import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { vertexApi } from "../services/api/vertex";
import { Call, callsApi } from "../services/api/calls";

import { Info, Target, Volume2, BookOpen, User, Phone, Clock, Calendar, CheckCircle, XCircle, FileText, ClipboardList, ArrowRight, ShieldAlert, ShieldCheck, Globe, ActivityIcon, Shield, TrendingUp } from 'lucide-react';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';

interface CallReport {
    "Agent fluency": { score: number; feedback: string };
    "Sentiment analysis": { score: number; feedback: string };
    "Fraud detection": { score: number; feedback: string };
    "Script coherence"?: { score: number; feedback: string };
    "Argumentation"?: { score: number; feedback: string };
    "Script adherence"?: { score: number; feedback: string };
    "overall": { score: number; feedback: string };
}

const initialReport: CallReport = {
    "Agent fluency": { score: 0, feedback: '' },
    "Sentiment analysis": { score: 0, feedback: '' },
    "Fraud detection": { score: 0, feedback: '' },
    "overall": { score: 0, feedback: '' }
};

function CallReportCard() {
    const location = useLocation();
    const callPased = location.state?.call; // Retrieve passed call object


    const [call, setCall] = useState<Call | null>(callPased || null);
    const [report, setReport] = useState<CallReport>(callPased?.ai_call_score || initialReport);

    const [transcription, setTranscription] = useState<any[] | string | null>(null);
    const [summary, setSummary] = useState<{ "key-ideas": [] }>({ "key-ideas": [] });
    const [callPostActions, setCallPostActions] = useState<[]>([]);

    const [loadingReport, setLoadingReport] = useState<boolean>(true);
    const [loadingTranscription, setLoadingTranscription] = useState<boolean>(true);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
    const [loadingPostActions, setLoadingPostActions] = useState<boolean>(true);


    const [errorReport, setErrorReport] = useState<string | null>(null);
    const [errorTranscription, setErrorTranscription] = useState<string | null>(null);
    const [errorSummary, setErrorSummary] = useState<string | null>(null);
    const [errorPostActions, setErrorPostActions] = useState<string | null>(null);




    const handleAnalyzeCall = async () => {
        if (!call) return;
        try {
            setLoadingReport(true);
            const response = await callsApi.analyze(call._id);
            if (response.success) {
                setReport(response.data);
                setCall({
                    ...call,
                    ai_call_score: response.data,
                    transcript: response.transcript || (call as any).transcript,
                    validByAI: response.validByAI
                });
            }
        } catch (err) {
            setErrorReport("Failed to analyze the call.");
        } finally {
            setLoadingReport(false);
        }
    };

    useEffect(() => {
        if (!call) return; // Ensure the call object exists

        if (call.ai_call_score && Object.keys(call.ai_call_score).length > 0 && call.ai_call_score.overall?.score) {
            // If scores exist in the database, use them
            setReport(call.ai_call_score);
            setLoadingReport(false);
        } else {
            // Use unified backend analysis
            handleAnalyzeCall();
        }

        // Fetch Transcription
        const fetchTranscription = async () => {
            try {
                setLoadingTranscription(true);
                const response = await vertexApi.getCallTranscription({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                setTranscription(response.transcription);
            } catch (err) {
                setErrorTranscription("Failed to transcribe the call.");
            } finally {
                setLoadingTranscription(false);
            }
        };

        // Fetch Summary
        const fetchSummary = async () => {
            try {
                setLoadingSummary(true);
                const response = await vertexApi.getCallSummary({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                console.info('summary response :', response);
                setSummary(response);
            } catch (err) {
                setErrorSummary("Failed to generate call summary.");
            } finally {
                setLoadingSummary(false);
            }
        };

        // Fetch Summary
        const fetchCallPostActions = async () => {
            try {
                setLoadingPostActions(true);
                const response = await vertexApi.getCallPostActions({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });

                setCallPostActions(response.plan_actions);
            } catch (err) {
                setErrorSummary("Failed to generate call post actions.");
            } finally {
                setLoadingPostActions(false);
            }
        };

        fetchTranscription();
        fetchSummary();
        fetchCallPostActions();
    }, [call]);

    // Spinner Component
    // **Spinner Component with Text**
    const LoadingSpinner = ({ text }: { text: string }) => (
        <div className="flex flex-col items-center py-4">
            <svg
                className="animate-spin h-10 w-10 text-rose-500 mb-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-sm text-gray-600">{text}</p>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-4 space-y-6">
            {/* Call Information */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Info className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm font-medium text-rose-500">Call Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-500" />
                        <span><strong>Agent:</strong> {call?.agent?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-500" />
                        <span><strong>Lead:</strong> {call?.lead?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <span><strong>Phone Number:</strong> {call?.phone_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span><strong>Duration:</strong> {call?.duration ? `${call.duration} sec` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span><strong>Call Date:</strong> {call?.createdAt ? new Date(call.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {call?.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span><strong>Status:</strong> {call?.status || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* AI Decision Panel - Final word */}
            <div className={`border rounded-xl p-6 transition-all duration-500 ${call?.validByAI === true
                    ? 'bg-emerald-50/50 border-emerald-100 shadow-sm'
                    : call?.validByAI === false
                        ? 'bg-rose-50/50 border-rose-100 shadow-sm'
                        : 'bg-slate-50/50 border-slate-100'
                }`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${call?.validByAI === true ? 'bg-emerald-500 text-white' :
                                call?.validByAI === false ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'
                            }`}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Décision Finale de l'IA</h3>
                            <p className="text-sm text-slate-500 font-medium">L'analyse chirurgicale Gemini détermine la conformité de l'appel.</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        {call?.validByAI === true ? (
                            <div className="flex flex-col items-end">
                                <span className="px-6 py-2 bg-emerald-500 text-white rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    CONFORME / VALIDÉ
                                </span>
                                <span className="text-[10px] text-emerald-600 mt-2 font-bold uppercase tracking-tighter">Transaction approuvée automatiquement</span>
                            </div>
                        ) : call?.validByAI === false ? (
                            <div className="flex flex-col items-end">
                                <span className="px-6 py-2 bg-rose-500 text-white rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-500/30 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" />
                                    NON CONFORME / REJETÉ
                                </span>
                                <span className="text-[10px] text-rose-600 mt-2 font-bold uppercase tracking-tighter">Transaction annulée par l'audit IA</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="px-6 py-2 bg-slate-200 text-slate-500 rounded-full text-sm font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    AUDIT EN COURS...
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Call Recording */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Volume2 className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm font-medium text-rose-500">Call Recording</h3>
                </div>
                {call?.recording_url ? (
                    <div className="mt-2">
                        {(() => {
                            const recordingUrl = call.recording_url_cloudinary || call.recording_url;
                            const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                            return <PremiumAudioPlayer url={finalUrl} />;
                        })()}
                    </div>
                ) : (
                    <p className="text-red-500">Recording not available.</p>
                )}
            </div>

            {/* Call Transcription */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <h3 className="text-sm font-medium text-purple-900">Call Transcription</h3>
                </div>
                {loadingTranscription ? <LoadingSpinner text="Generating call transcription ..." /> : errorTranscription ? <p className="text-red-500">{errorTranscription}</p> : (
                    <div className="bg-gray-100 p-3 rounded-md text-sm text-gray-800 space-y-2 max-h-96 overflow-y-auto">
                        {Array.isArray(transcription) ? transcription.map((item, idx) => (
                            <div key={idx} className="flex flex-col mb-2">
                                <span className="font-bold text-xs text-purple-600">{item.speaker} {item.timestamp ? `[${item.timestamp}]` : ''}</span>
                                <span className="text-gray-700">{item.text}</span>
                            </div>
                        )) : transcription}
                    </div>
                )}
            </div>

            {/* Call Summarization */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <BookOpen className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm font-medium text-rose-500">Call Summary</h3>
                </div>
                {loadingSummary ? <LoadingSpinner text="Generating call Summary ..." /> : errorSummary ? <p className="text-red-500">{errorSummary}</p> : (
                    <div className="text-sm text-gray-800">
                        {/*   {summary} */}
                        <div className="text-sm text-black-800">
                            {summary["key-ideas"]?.length === 0 ? (
                                <p>Unable to generate summary!</p>
                            ) : (
                                <ul className="space-y-2">
                                    {summary["key-ideas"].map((ideaObj, index) => {
                                        const [idea, details] = Object.entries(ideaObj)[0]; // Extract key-value pair
                                        return (
                                            <li key={index} className="flex items-start space-x-2">
                                                <ArrowRight className="h-4 w-4 text-rose-400 mt-1 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <span className="font-medium text-black">{idea} :</span>{" "}
                                                    <span className="text-gray-800">{details}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                        </div>
                    </div>
                )}
            </div>
            {/* Call Post Actions */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <ClipboardList className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm font-medium text-rose-500">Call Follow Up Actions</h3>
                </div>
                {loadingPostActions ? <LoadingSpinner text="Generating call Follow Up Actions ..." /> : errorPostActions ? <p className="text-red-500">{errorPostActions}</p> : (
                    <div className="text-sm text-black-800">
                        {callPostActions.length === 0 ? <p>There are no Follow up actions ! </p> :
                            <ul className="space-y-2">
                                {callPostActions.map((action, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <ArrowRight className="h-4 w-4 text-rose-400 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <span className="text-gray-800">{action}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        }
                    </div>
                )}
            </div>
            {/* Call Report */}
            <div className="border border-gray-100 rounded-2xl p-6 bg-slate-50/30">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                            <Target className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Scoring Détaillé IA</h3>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Global</p>
                            <p className="text-2xl font-black text-slate-900">{report.overall.score}%</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.overall.score >= 80 ? 'bg-emerald-500 text-white' :
                                report.overall.score >= 50 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                            }`}>
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {loadingReport ? <LoadingSpinner text="Analyse en cours par Gemini..." /> : errorReport ? <p className="text-red-500">{errorReport}</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { label: 'Fluidité Agent', data: report["Agent fluency"], icon: Globe, color: 'blue' },
                            { label: 'Analyse Sentiment', data: report["Sentiment analysis"], icon: ActivityIcon, color: 'indigo' },
                            { label: 'Fraude & Intégrité', data: report["Fraud detection"], icon: ShieldAlert, color: 'rose' },
                            { label: 'Cohérence Script', data: report["Script coherence"], icon: ShieldCheck, color: 'emerald' },
                            { label: 'Qualité Argumentation', data: report["Argumentation"], icon: TrendingUp, color: 'amber' },
                            { label: 'Adhérence Script', data: report["Script adherence"], icon: BookOpen, color: 'violet' }
                        ].filter(m => m.data).map((metric, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-200 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-${metric.color}-50 text-${metric.color}-600`}>
                                            {metric.icon && <metric.icon className="w-5 h-5" />}
                                        </div>
                                        <span className="font-bold text-slate-700">{metric.label}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${metric.data!.score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                            metric.data!.score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                        }`}>
                                        {metric.data!.score}%
                                    </span>
                                </div>

                                <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${metric.data!.score >= 80 ? 'bg-emerald-500' :
                                                metric.data!.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                        style={{ width: `${metric.data!.score}%` }}
                                    />
                                </div>

                                <div className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                                    {metric.data!.feedback.split(/("(?:[^"\\]|\\.)*")/).map((part, i) =>
                                        part.startsWith('"') ? (
                                            <mark key={i} className="bg-rose-100 text-rose-900 font-bold px-1 rounded mx-1">
                                                {part}
                                            </mark>
                                        ) : part
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CallReportCard;
