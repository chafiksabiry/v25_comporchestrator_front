import React, { useState, useEffect } from 'react';
import { saveGigAvailability, getGigAvailability, updateGigAvailability } from '../api/gigWeightsApi';
import { Availability, DaySchedule } from '../types/matching';

interface GigAvailabilityManagerProps {
    gigId: string;
}

const GigAvailabilityManager: React.FC<GigAvailabilityManagerProps> = ({ gigId }) => {
    const [availability, setAvailability] = useState<Availability>({
        schedule: [],
        timeZone: 'UTC',
        flexibility: []
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Charger l'availability existante
    useEffect(() => {
        loadAvailability();
    }, [gigId]);

    const loadAvailability = async () => {
        try {
            setLoading(true);
            const data = await getGigAvailability(gigId);
            setAvailability(data);
            setMessage('Availability loaded successfully');
        } catch (error) {
            console.error('Error loading availability:', error);
            setMessage('Error loading availability');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAvailability = async () => {
        try {
            setLoading(true);
            await saveGigAvailability(gigId, availability);
            setMessage('Availability saved successfully!');
        } catch (error) {
            console.error('Error saving availability:', error);
            setMessage('Error saving availability');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAvailability = async () => {
        try {
            setLoading(true);
            await updateGigAvailability(gigId, availability);
            setMessage('Availability updated successfully!');
        } catch (error) {
            console.error('Error updating availability:', error);
            setMessage('Error updating availability');
        } finally {
            setLoading(false);
        }
    };

    const addScheduleDay = () => {
        const newDay: DaySchedule = {
            day: 'Monday',
            hours: { start: '09:00', end: '17:00' }
        };
        setAvailability(prev => ({
            ...prev,
            schedule: [...prev.schedule, newDay]
        }));
    };

    const updateScheduleDay = (index: number, field: keyof DaySchedule, value: any) => {
        setAvailability(prev => ({
            ...prev,
            schedule: prev.schedule.map((day, i) =>
                i === index ? { ...day, [field]: value } : day
            )
        }));
    };

    const removeScheduleDay = (index: number) => {
        setAvailability(prev => ({
            ...prev,
            schedule: prev.schedule.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Gig Availability Manager</h2>

            {message && (
                <div className={`p-3 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Time Zone</label>
                <input
                    type="text"
                    value={availability.timeZone}
                    onChange={(e) => setAvailability(prev => ({ ...prev, timeZone: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="UTC"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Flexibility</label>
                <input
                    type="text"
                    value={availability.flexibility.join(', ')}
                    onChange={(e) => setAvailability(prev => ({
                        ...prev,
                        flexibility: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    className="w-full p-2 border rounded"
                    placeholder="flexible hours, remote work"
                />
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Schedule</label>
                    <button
                        onClick={addScheduleDay}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Add Day
                    </button>
                </div>

                {availability.schedule.map((day, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-2 border rounded">
                        <select
                            value={day.day}
                            onChange={(e) => updateScheduleDay(index, 'day', e.target.value)}
                            className="p-1 border rounded"
                        >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>

                        <input
                            type="time"
                            value={day.hours.start}
                            onChange={(e) => updateScheduleDay(index, 'hours', { ...day.hours, start: e.target.value })}
                            className="p-1 border rounded"
                        />

                        <span className="self-center">to</span>

                        <input
                            type="time"
                            value={day.hours.end}
                            onChange={(e) => updateScheduleDay(index, 'hours', { ...day.hours, end: e.target.value })}
                            className="p-1 border rounded"
                        />

                        <button
                            onClick={() => removeScheduleDay(index)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleSaveAvailability}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Availability'}
                </button>

                <button
                    onClick={handleUpdateAvailability}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Updating...' : 'Update Availability'}
                </button>

                <button
                    onClick={loadAvailability}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Reload'}
                </button>
            </div>
        </div>
    );
};

export default GigAvailabilityManager;
