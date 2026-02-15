import React from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { slotApi } from '../../services/slotService';
import axios from 'axios';

interface SlotGeneratorProps {
    gigId: string | null | undefined;
    companyId?: string | null;
    onSlotsGenerated?: () => void;
}

export function SlotGenerator({ gigId, companyId, onSlotsGenerated }: SlotGeneratorProps) {
    const [capacity, setCapacity] = useState<number>(1);
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('18:00');
    const [generating, setGenerating] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loadingGig, setLoadingGig] = useState<boolean>(false);
    const [availableHours, setAvailableHours] = useState<string[]>([]);

    // Fetch gig data and extract available hours
    useEffect(() => {
        const fetchGigData = async () => {
            if (!gigId) {
                setAvailableHours([]);
                return;
            }

            try {
                setLoadingGig(true);
                const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
                const response = await axios.get(`${apiUrl}/gigs/${gigId}`);

                // Direct handle response data or data.data
                const gig = (response.data as any).data || response.data;

                // Extract available hours from gig availability
                if (gig.availability?.schedule && Array.isArray(gig.availability.schedule)) {
                    const hours = new Set<string>();

                    gig.availability.schedule.forEach((daySchedule: any) => {
                        if (daySchedule.hours?.start && daySchedule.hours?.end) {
                            const startHour = parseInt(daySchedule.hours.start.split(':')[0], 10);
                            const endHour = parseInt(daySchedule.hours.end.split(':')[0], 10);

                            for (let h = startHour; h <= endHour; h++) {
                                hours.add(`${h.toString().padStart(2, '0')}:00`);
                            }
                        }
                    });

                    const sortedHours = Array.from(hours).sort();
                    setAvailableHours(sortedHours);

                    // Set default start and end times
                    if (sortedHours.length > 0) {
                        setStartTime(sortedHours[0]);
                        setEndTime(sortedHours[sortedHours.length - 1]);
                    }
                } else {
                    // No availability defined, show all hours
                    const allHours = Array.from({ length: 15 }, (_, i) => {
                        const h = i + 6;
                        return `${h.toString().padStart(2, '0')}:00`;
                    });
                    setAvailableHours(allHours);
                }
            } catch (error) {
                console.error('Error fetching gig data:', error);
                setMessage({ text: 'Failed to load gig availability', type: 'error' });
                // Fallback to default hours
                const allHours = Array.from({ length: 15 }, (_, i) => {
                    const h = i + 6;
                    return `${h.toString().padStart(2, '0')}:00`;
                });
                setAvailableHours(allHours);
            } finally {
                setLoadingGig(false);
            }
        };

        fetchGigData();
    }, [gigId]);

    const handleGenerate = async () => {
        if (!gigId) {
            setMessage({ text: 'Please select a gig first', type: 'error' });
            return;
        }

        try {
            const startHour = parseInt(startTime.split(':')[0], 10);
            const endHour = parseInt(endTime.split(':')[0], 10);

            if (startHour >= endHour) {
                setMessage({ text: 'End time must be after start time', type: 'error' });
                return;
            }

            setGenerating(true);
            setMessage(null);

            // Create for next 7 days instead of just today/tomorrow to be sure
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');
            const end = new Date();
            end.setDate(today.getDate() + 7);
            const endStr = format(end, 'yyyy-MM-dd');

            const params: any = {
                gigId,
                companyId,
                startDate: todayStr,
                endDate: endStr,
                slotDuration: 1,
                capacity,
                startHour,
                endHour
            };

            const result = await slotApi.generateSlots(params);

            setMessage({
                text: result.message || 'Slots created successfully for the next 7 days',
                type: 'success'
            });

            if (onSlotsGenerated) {
                setTimeout(() => {
                    onSlotsGenerated();
                    setMessage(null);
                }, 2000);
            }
        } catch (error: any) {
            console.error('Error creating slots:', error);
            setMessage({
                text: error.response?.data?.message || error.message || 'Failed to create slots',
                type: 'error'
            });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">Create Slots</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                Automatically create available time slots for this gig based on the parameters below.
            </p>

            {loadingGig ? (
                <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading gig availability...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                        <select
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                        >
                            {availableHours.map(hour => (
                                <option key={hour} value={hour}>{hour}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                        <select
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                        >
                            {availableHours.map(hour => (
                                <option key={hour} value={hour}>{hour}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Capacity (reps per slot)</label>
                        <input
                            type="number"
                            value={capacity}
                            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                            min={1}
                            max={50}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                        />
                    </div>
                </div>
            )}

            {message && (
                <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={generating || !gigId || loadingGig}
                className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {generating ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                    </>
                ) : (
                    <>
                        <Calendar className="w-4 h-4" />
                        Create Slots
                    </>
                )}
            </button>
        </div>
    );
}
