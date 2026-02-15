export interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
    gigId?: string;
    status: 'available' | 'reserved' | 'full' | 'cancelled';
    duration: number; // in hours
    notes?: string;
    repId: string; // Keep for compatibility with single-reservation components
    capacity?: number;
    reservedCount?: number;
    reservations?: {
        agentId: any;
        notes?: string;
        reservedAt?: string;
    }[];
    attended?: boolean;
    attendanceNotes?: string;
    agent?: any;
    gig?: any;
}

export interface Gig {
    id: string;
    name: string;
    description: string;
    company: string;
    color: string; // for visual identification
    skills: string[]; // Skills required for this gig
    priority: 'low' | 'medium' | 'high';
}

export interface Rep {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    specialties: string[];
    performanceScore?: number; // AI-calculated performance score
    preferredHours?: { start: number; end: number }; // Preferred working hours
    attendanceScore?: number; // Attendance reliability score (0-100)
    attendanceHistory?: AttendanceRecord[]; // History of attendance
}

export interface AttendanceRecord {
    date: string;
    slotId: string;
    attended: boolean;
    reason?: string;
}

export interface Company {
    id: string;
    name: string;
    logo?: string;
    priority?: number; // Priority level for scheduling
}

export interface WeeklyStats {
    totalHours: number;
    projectBreakdown: Record<string, number>;
    availableSlots: number;
    reservedSlots: number;
}

export type UserRole = 'rep' | 'company' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId?: string; // For company users
    repId?: string; // For rep users
}

export interface AIRecommendation {
    repId: string;
    gigId: string;
    confidence: number; // 0-1 score of match confidence
    reason: string;
}

export interface PerformanceMetric {
    repId: string;
    metric: 'satisfaction' | 'efficiency' | 'quality' | 'attendance';
    value: number; // 0-100
}

export interface WorkloadPrediction {
    date: string;
    predictedHours: number;
    actualHours?: number;
}
