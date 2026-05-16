import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { vertexApi } from "../services/api/vertex";
import { Call, callsApi } from "../services/api/calls";

import { Info, Target, Volume2, BookOpen, User, Phone, Clock, Calendar, CheckCircle, XCircle, FileText, ClipboardList, ArrowRight, ShieldAlert, ShieldCheck, Globe, ActivityIcon, Shield, TrendingUp } from 'lucide-react';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';

    "Agent fluency": { score: number; feedback: string };
    "Sentiment analysis": { score: number; feedback: string };
    "Fraud detection": { score: number; feedback: string };
    "Script coherence"?: { score: number; feedback: string };
    "Argumentation"?: { score: number; feedback: string };
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



    const handleValidateByCompany = async (isValidByCompany: boolean) => {
        if (!call) return;
        try {
            const updatedTransaction = {
                validByCompany: isValidByCompany,
                valid: (call.transaction?.validByAI === true && isValidByCompany === true)
            };
            const response = await callsApi.update(call._id, { transaction: updatedTransaction } as any);
            if (response && response.success) {
                const updatedCall = response.data || response.call || response;
                setCall(updatedCall);
            }
        } catch (err) {
            console.error("Failed to update transaction validation:", err);
        }
    };

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

            {/* Transaction Dual-Validation Panel */}
            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-indigo-900">Validation de la Transaction</h3>
                    </div>
                    {call?.transaction?.valid ? (
                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/25">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            Validation Globale OK
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                            En cours de validation
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* AI Validation */}
                    <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Validation AI (Automatique)</p>
                            <p className="text-sm font-semibold text-slate-700">DÉCISION AI :</p>
                        </div>
                        <div>
                            {call?.validByAI === true ? (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black uppercase tracking-wider">
                                    CONFORME / TRANSACTION DÉTECTÉE
                                </span>
                            ) : call?.validByAI === false ? (
                                <span className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-wider">
                                    NON CONFORME / REFUS
                                </span>
                            ) : (
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider animate-pulse">
                                    ANALYSE EN COURS...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Company Validation */}
                    <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Entreprise (Company)</p>
                            <p className="text-sm font-semibold text-slate-700">VOTRE VALIDATION :</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleValidateByCompany(true)}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                                    call?.transaction?.validByCompany === true
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                        : 'bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-200'
                                }`}
                            >
                                Approuver
                            </button>
                            <button
                                type="button"
                                onClick={() => handleValidateByCompany(false)}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                                    call?.transaction?.validByCompany === false
                                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                                        : 'bg-white hover:bg-slate-50 text-rose-600 border border-rose-200'
                                }`}
                            >
                                Refuser
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-xs text-slate-400 italic">
                    💡 La transaction est considérée comme globalement valide uniquement lorsque le représentant ET l'entreprise ont tous deux marqué la transaction comme approuvée / confirmée.
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
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Target className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm font-medium text-rose-500">Call Scoring metrix</h3>
                </div>

                {loadingReport ? <LoadingSpinner text="Generating call scoring ..." /> : errorReport ? <p className="text-red-500">{errorReport}</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {[
                                { label: 'Agent Fluency', data: report["Agent fluency"], icon: Globe },
                                { label: 'Sentiment Analysis', data: report["Sentiment analysis"], icon: ActivityIcon },
                                { label: 'Fraud Detection', data: report["Fraud detection"], icon: ShieldAlert },
                                { label: 'Script Coherence', data: report["Script coherence"], icon: ShieldCheck },
                                { label: 'Argumentation Quality', data: report["Argumentation"], icon: TrendingUp }
                            ].map((metric, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                                            {metric.icon && <metric.icon className="w-4 h-4" />}
                                        </div>
                                        <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">{metric.label}</label>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-500 ${metric.data?.score >= 80 ? "bg-emerald-500" :
                                                    metric.data?.score >= 60 ? "bg-amber-500" : "bg-rose-500"
                                                    }`}
                                                style={{ width: `${metric.data?.score || 0}%` }}
                                            />
                                        </div>
                                        <div className="text-xl font-black text-gray-900">{metric.data?.score || 0}%</div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2 font-medium leading-relaxed italic">&quot;{metric.data?.feedback || 'Analysis completed.'}&quot;</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Overall Score</h4>
                                <div className="text-4xl font-bold text-rose-500 mb-2">
                                    {report.overall.score}%
                                </div>
                                <p className="text-sm text-gray-600">{report.overall.feedback}</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default CallReportCard;
