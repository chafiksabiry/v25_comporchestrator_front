import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { slotApi, SlotGenerationParams } from '../../services/slotService';

interface SlotGeneratorProps {
    gigId: string;
    onSlotsGenerated?: () => void;
}

export function SlotGenerator({ gigId, onSlotsGenerated }: SlotGeneratorProps) {
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [slotDuration, setSlotDuration] = useState<number>(1);
    const [capacity, setCapacity] = useState<number>(1);
    const [startHour, setStartHour] = useState<number>(9);
    const [endHour, setEndHour] = useState<number>(18);
    const [generating, setGenerating] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleGenerate = async () => {
        if (!gigId) {
            setMessage({ text: 'Please select a gig first', type: 'error' });
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setMessage({ text: 'End date must be after start date', type: 'error' });
            return;
        }

        if (startHour >= endHour) {
            setMessage({ text: 'End hour must be after start hour', type: 'error' });
            return;
        }

        setGenerating(true);
        setMessage(null);

        try {
            const params: SlotGenerationParams = {
                gigId,
                startDate,
                endDate,
                slotDuration,
                capacity,
                startHour,
                endHour
            };

            const result = await slotApi.generateSlots(params);
            setMessage({ text: result.message, type: 'success' });
            if (onSlotsGenerated) {
                setTimeout(() => {
                    onSlotsGenerated();
                    setMessage(null);
                }, 2000);
            }
        } catch (error: any) {
            setMessage({
                text: error.response?.data?.message || 'Failed to generate slots',
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
                <h3 className="text-base font-semibold text-gray-900">Generate Slots</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                Automatically create available time slots for this gig based on the parameters below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Slot Duration (hours)</label>
                    <select
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(parseFloat(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                    >
                        <option value="0.5">30 minutes</option>
                        <option value="1">1 hour</option>
                        <option value="1.5">1.5 hours</option>
                        <option value="2">2 hours</option>
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
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Hour</label>
                    <select
                        value={startHour}
                        onChange={(e) => setStartHour(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 6).map(h => (
                            <option key={h} value={h}>{h}:00</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Hour</label>
                    <select
                        value={endHour}
                        onChange={(e) => setEndHour(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 6).map(h => (
                            <option key={h} value={h}>{h}:00</option>
                        ))}
                    </select>
                </div>
            </div>

            {message && (
                <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${
                    message.type === 'success' 
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
                disabled={generating || !gigId}
                className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {generating ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <Calendar className="w-4 h-4" />
                        Generate Slots
                    </>
                )}
            </button>
        </div>
    );
}
