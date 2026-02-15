import React from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { slotApi } from '../../services/slotService';
import axios from 'axios';

interface SlotGeneratorProps {
    gigId: string | null | undefined;
    companyId?: string | null;
    selectedDate: Date;
    onSlotsGenerated?: () => void;
}

export function SlotGenerator({ gigId, companyId, selectedDate, onSlotsGenerated }: SlotGeneratorProps) {
    const [capacity, setCapacity] = useState<number>(1);
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('18:00');
    const [generating, setGenerating] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loadingGig, setLoadingGig] = useState<boolean>(false);
    const [availableHours, setAvailableHours] = useState<string[]>([]);
    const [isAvailableToday, setIsAvailableToday] = useState<boolean>(true);

    // Fetch gig data and extract available hours for the selected day
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
                const selectedDayName = format(selectedDate, 'EEEE'); // e.g., 'Monday'

                // Extract available hours from gig availability for the specific day
                if (gig.availability?.schedule && Array.isArray(gig.availability.schedule)) {
                    const hours = new Set<string>();

                    // Filter schedule for the selected day
                    const daySchedule = gig.availability.schedule.find(
                        (s: any) => s.day.toLowerCase() === selectedDayName.toLowerCase()
                    );

                    if (daySchedule && daySchedule.hours?.start && daySchedule.hours?.end) {
                        const startHour = parseInt(daySchedule.hours.start.split(':')[0], 10);
                        const endHour = parseInt(daySchedule.hours.end.split(':')[0], 10);

                        for (let h = startHour; h <= endHour; h++) {
                            hours.add(`${h.toString().padStart(2, '0')}:00`);
                        }

                        const sortedHours = Array.from(hours).sort();
                        setAvailableHours(sortedHours);
                        setIsAvailableToday(true);

                        // Set default start and end times based on day's hours
                        if (sortedHours.length > 0) {
                            setStartTime(sortedHours[0]);
                            setEndTime(sortedHours[sortedHours.length - 1]);
                        }
                    } else {
                        // Not available on this specific day
                        setAvailableHours([]);
                        setIsAvailableToday(false);
                    }
                } else {
                    // No availability defined at all, default to full day for backward compat
                    const allHours = Array.from({ length: 15 }, (_, i) => {
                        const h = i + 6;
                        return `${h.toString().padStart(2, '0')}:00`;
                    });
                    setAvailableHours(allHours);
                    setIsAvailableToday(true);
                }
            } catch (error) {
                console.error('Error fetching gig data:', error);
                setMessage({ text: 'Failed to load gig availability', type: 'error' });
                setIsAvailableToday(false);
            } finally {
                setLoadingGig(false);
            }
        };

        fetchGigData();
    }, [gigId, selectedDate]);

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

            // Create for the specific selected date
            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            const params: any = {
                gigId,
                companyId,
                startDate: dateStr,
                endDate: dateStr, // Same day for precise creation
                slotDuration: 1,
                capacity,
                startHour,
                endHour
            };

            const result = await slotApi.generateSlots(params);

            setMessage({
                text: result.message || `Slots created successfully for ${dateStr}`,
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

    // If not loading and not available today, hide the component
    if (!loadingGig && !isAvailableToday && gigId) {
        return null;
    }

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
