import React, { useState, useEffect } from 'react';
import { CompanyView as LocalCompanyView } from '../scheduler/CompanyView';
import { getGigsByCompanyId, getActiveAgentsForCompany } from '../../api/matching';
import { TimeSlot, Project, Rep } from '../../types/scheduler';
import Cookies from 'js-cookie';

import { format, addHours, startOfToday } from 'date-fns';

const SessionPlanning = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companyId = Cookies.get('companyId');
        if (!companyId) return;

        const [gigsData, agentsData] = await Promise.all([
          getGigsByCompanyId(companyId),
          getActiveAgentsForCompany(companyId)
        ]);

        // Map Gigs to Projects
        const mappedProjects: Project[] = gigsData.map((gig: any) => ({
          id: gig._id,
          name: gig.title,
          description: gig.description,
          company: gig.companyName || 'My Company',
          color: '#4F46E5', // Default Indigo
          skills: gig.requiredSkills?.map((s: any) => s.name || s) || [],
          priority: 'medium'
        }));

        // Map Agents to Reps
        const mappedReps: Rep[] = agentsData.map((agent: any) => ({
          id: agent._id || agent.agentId,
          name: agent.personalInfo?.name || agent.name || 'Unknown Rep',
          email: agent.personalInfo?.email || agent.email || '',
          specialties: agent.skills?.professional?.map((s: any) => s.name || s.skill) || [],
          avatar: agent.personalInfo?.photo || undefined
        }));

        setProjects(mappedProjects);
        setReps(mappedReps);

        // Generate mock slots for demonstration
        const mockSlots: TimeSlot[] = [];
        const today = new Date();
        const dateStr = format(today, 'yyyy-MM-dd');

        if (mappedProjects.length > 0 && mappedReps.length > 0) {
          // Create 3-5 slots per rep
          mappedReps.forEach((rep, index) => {
            const numSlots = 3 + (index % 3);
            for (let i = 0; i < numSlots; i++) {
              const startHour = 9 + i * 2; // 9, 11, 13, etc.
              const projectIndex = (index + i) % mappedProjects.length;

              mockSlots.push({
                id: `slot-${rep.id}-${i}`,
                startTime: `${startHour.toString().padStart(2, '0')}:00`,
                endTime: `${(startHour + 2).toString().padStart(2, '0')}:00`,
                date: dateStr,
                projectId: mappedProjects[projectIndex].id,
                status: 'reserved',
                duration: 2,
                notes: `Scheduled session for ${mappedProjects[projectIndex].name}`,
                repId: rep.id
              });
            }
          });
        }

        setSlots(mockSlots);

      } catch (error) {
        console.error('Error fetching session planning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading session planning...</div>;
  }

  return (
    <LocalCompanyView
      company="My Company"
      slots={slots}
      projects={projects}
      reps={reps}
      selectedDate={selectedDate}
    />
  );
};

export default SessionPlanning;
