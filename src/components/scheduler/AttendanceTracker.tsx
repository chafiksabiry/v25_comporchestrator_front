import React, { useState } from 'react';
import { TimeSlot, Rep } from '../../types/scheduler';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface AttendanceTrackerProps {
    slots: TimeSlot[];
    reps: Rep[];
    selectedDate: Date;
    onAttendanceUpdate: (slotId: string, attended: boolean, notes?: string) => void;
}

export function AttendanceTracker({ slots, reps, selectedDate, onAttendanceUpdate }: AttendanceTrackerProps) {
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
    const [attendanceNotes, setAttendanceNotes] = useState<string>('');

    // Filter slots for the selected date that are reserved (not available or cancelled)
    const dateSlots = slots.filter(
        slot =>
            slot.date === format(selectedDate, 'yyyy-MM-dd') &&
            slot.status === 'reserved'
    );

    const handleAttendanceToggle = (slot: TimeSlot, attended: boolean) => {
        onAttendanceUpdate(slot.id, attended, attendanceNotes);
        setExpandedSlot(null);
        setAttendanceNotes('');
    };

    const getRepName = (repId: string): string => {
        const rep = reps.find(r => r.id === repId);
        return rep ? rep.name : 'Unknown REP';
    };

    if (dateSlots.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-4">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">Attendance Tracking</h2>
                </div>
                <div className="text-center py-8 text-gray-500">
                    No reserved slots for this date to track attendance
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Attendance Tracking</h2>
            </div>

            <div className="space-y-3">
                {dateSlots.map(slot => {
                    const isExpanded = expandedSlot === slot.id;

                    return (
                        <div key={slot.id} className="border rounded-lg overflow-hidden">
                            <div
                                className={`p-3 flex items-center justify-between cursor-pointer ${slot.attended === true
                                        ? 'bg-green-50'
                                        : slot.attended === false
                                            ? 'bg-red-50'
                                            : 'bg-white'
                                    }`}
                                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                            >
                                <div>
                                    <div className="font-medium">{getRepName(slot.repId)}</div>
                                    <div className="text-sm text-gray-600">
                                        {slot.startTime} - {slot.endTime}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    {slot.attended === true && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Attended
                                        </span>
                                    )}
                                    {slot.attended === false && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Missed
                                        </span>
                                    )}
                                    {slot.attended === undefined && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Not Recorded
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-3 border-t bg-gray-50">
                                    <div className="mb-3">
                                        <label htmlFor="attendanceNotes" className="block text-sm font-medium text-gray-700 mb-1">
                                            Notes
                                        </label>
                                        <textarea
                                            id="attendanceNotes"
                                            value={attendanceNotes}
                                            onChange={(e) => setAttendanceNotes(e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            rows={2}
                                            placeholder="Add notes about attendance..."
                                        />
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleAttendanceToggle(slot, true)}
                                            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center justify-center"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark Attended
                                        </button>
                                        <button
                                            onClick={() => handleAttendanceToggle(slot, false)}
                                            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium flex items-center justify-center"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Mark Missed
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
