import React, { useState } from 'react';
import { TimeSlot, Project } from '../../types/scheduler';
import { Edit2, Trash2 } from 'lucide-react';

interface SlotActionPanelProps {
    slot: TimeSlot;
    maxHours: number;
    availableProjects: Project[];
    onUpdate: (updates: Partial<TimeSlot>) => void;
    onClear: () => void;
}

export function SlotActionPanel({ slot, maxHours, availableProjects, onUpdate, onClear }: SlotActionPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [projectId, setProjectId] = useState(slot.projectId || '');
    const [notes, setNotes] = useState(slot.notes || '');

    const handleSave = () => {
        onUpdate({
            projectId: projectId || undefined,
            notes: notes || undefined,
            status: projectId ? 'reserved' : 'available'
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setProjectId(slot.projectId || '');
        setNotes(slot.notes || '');
        setIsEditing(false);
    };

    if (!isEditing && !slot.projectId) {
        return (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                <p className="text-gray-500 mb-2">No project assigned to this slot</p>
                <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Assign Project
                </button>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                <h3 className="font-semibold mb-3">Edit Slot Details</h3>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="">Select a project...</option>
                        {availableProjects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name} ({project.company})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={3}
                        placeholder="Add notes about this session..."
                    />
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleCancel}
                        className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    const project = availableProjects.find(p => p.id === slot.projectId);

    return (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-l-4" style={{ borderLeftColor: project?.color || '#ccc' }}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-lg">{project?.name}</h3>
                    <p className="text-sm text-gray-600">{project?.company}</p>
                </div>
                <div className="flex space-x-1">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                        title="Edit details"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClear}
                        className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                        title="Clear slot"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {slot.notes && (
                <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    <p className="text-gray-500 italic">"{slot.notes}"</p>
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1">
                {project?.skills.map(skill => (
                    <span key={skill} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    );
}
