import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Briefcase,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckSquare,
  Square,
  ArrowLeft
} from 'lucide-react';
import Cookies from 'js-cookie';

interface Gig {
  _id: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  budget?: string;
  companyId: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  issues?: string[];
}

interface Company {
  _id: string;
  name: string;
  industry?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
}

interface CompanyResponse {
  success: boolean;
  message: string;
  data: Company;
}

const ApprovalPublishing = () => {
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [selectedGigs, setSelectedGigs] = useState<string[]>([]);
  const [filter, setFilter] = useState('pending');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'preview' | 'edit'>('main');
  const [currentGigData, setCurrentGigData] = useState<any>(null);
  const [skillsData, setSkillsData] = useState<{[key: string]: any}>({});
  const [timezoneData, setTimezoneData] = useState<{[key: string]: any}>({});

  useEffect(() => {
    fetchGigs();
    fetchCompanyDetails();
  }, []);

    const fetchCompanyDetails = async () => {
    try {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        console.error('❌ Company ID not found for company details');
        return;
      }

      const response = await axios.get<CompanyResponse>(`${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/details`);
      console.log('🏢 Company details fetched:', response.data.data);
      setCompany(response.data.data);
    } catch (err) {
      console.error('❌ Error fetching company details:', err);
    }
  };

  const fetchGigs = async () => {
    console.log('🔄 Starting fetchGigs...');
    setIsLoading(true);
    setError(null);
    
    try {
      const companyId = Cookies.get('companyId');
      const gigId = Cookies.get('gigId');
      const userId = Cookies.get('userId');
      
      console.log('📋 Cookies found:', { companyId, gigId, userId });
      
      if (!companyId) {
        console.error('❌ Company ID not found in cookies');
        throw new Error('Company ID not found');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`;
      console.log('🌐 Fetching from API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${gigId}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        throw new Error('Failed to fetch gigs');
      }

      const data = await response.json();
      console.log('📦 Raw API data:', data);
      
      if (data.data) {
        console.log('📊 Found gigs data, transforming...');
        // Transformer les données pour correspondre à l'interface attendue
        const transformedGigs = data.data.map((gig: any) => {
          const transformed = {
            _id: gig._id,
            title: gig.title,
            description: gig.description,
            status: gig.status || 'pending',
            category: gig.category,
            budget: gig.commission?.baseAmount && gig.commission.baseAmount !== '0' ? `$${gig.commission.baseAmount}` : null,
            companyId: gig.companyId,
            companyName: gig.companyName || gig.company?.name || company?.name || 'Company',
            createdAt: gig.createdAt,
            updatedAt: gig.updatedAt,
            submittedBy: gig.submittedBy || gig.companyName || gig.company?.name || company?.name || 'Company',
            issues: gig.issues || []
          };
          console.log('🔄 Transformed gig:', transformed);
          return transformed;
        });
        
        console.log('✅ Setting gigs state with', transformedGigs.length, 'gigs');
        setGigs(transformedGigs);
      } else {
        console.warn('⚠️ No data property in API response');
        setGigs([]);
      }
    } catch (err) {
      console.error('❌ Error fetching gigs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch gigs');
    } finally {
      console.log('🏁 fetchGigs completed, setting loading to false');
      setIsLoading(false);
    }
  };

  const toggleGig = (id: string) => {
    console.log('🔄 Toggling gig expansion:', id, 'Current expanded:', expandedGig);
    setExpandedGig(expandedGig === id ? null : id);
  };

  const toggleSelectGig = (id: string) => {
    console.log('🔄 Toggling gig selection:', id, 'Currently selected:', selectedGigs);
    if (selectedGigs.includes(id)) {
      setSelectedGigs(selectedGigs.filter(gigId => gigId !== id));
    } else {
      setSelectedGigs([...selectedGigs, id]);
    }
  };

  const selectAllGigs = () => {
    console.log('🔄 Selecting all gigs. Current selected:', selectedGigs.length, 'Total filtered:', filteredGigs.length);
    if (selectedGigs.length === filteredGigs.length) {
      setSelectedGigs([]);
    } else {
      setSelectedGigs(filteredGigs.map(gig => gig._id));
    }
  };

  const filteredGigs = gigs.filter(gig => {
    if (filter === 'all') return true;
    
    // Mapping des statuts pour la compatibilité
    const statusMapping: { [key: string]: string[] } = {
      'pending': ['pending', 'to_activate', 'draft', 'submitted'],
      'approved': ['approved', 'active', 'published'],
      'rejected': ['rejected', 'declined', 'cancelled', 'inactive'],
      'archived': ['archived']
    };
    
    const validStatuses = statusMapping[filter] || [filter];
    const isMatch = validStatuses.includes(gig.status);
    
    console.log(`🔍 Filtering gig ${gig._id} (${gig.title}): status="${gig.status}", filter="${filter}", validStatuses=${JSON.stringify(validStatuses)}, isMatch=${isMatch}`);
    
    return isMatch;
  });
  
  console.log('🔍 Filtered gigs:', { 
    filter, 
    totalGigs: gigs.length, 
    filteredCount: filteredGigs.length,
    gigs: filteredGigs.map(g => ({ id: g._id, title: g.title, status: g.status }))
  });

  const formatDate = (dateString: string) => {
    console.log('📅 Formatting date:', dateString);
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    let result;
    if (diffInHours < 1) result = 'Just now';
    else if (diffInHours < 24) result = `${diffInHours} hours ago`;
    else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) result = '1 day ago';
      else result = `${diffInDays} days ago`;
    }
    
    console.log('📅 Formatted result:', result);
    return result;
  };

  const formatStatus = (status: string) => {
    // Mapping des statuts pour l'affichage
    const statusMapping: { [key: string]: string } = {
      'to_activate': 'To active',
      'pending': 'Pending',
      'draft': 'Draft',
      'submitted': 'Submitted',
      'approved': 'Approved',
      'active': 'Active',
      'published': 'Published',
      'rejected': 'Rejected',
      'declined': 'Declined',
      'cancelled': 'Cancelled',
      'inactive': 'Inactive',
      'archived': 'Archived'
    };
    
    // Si le statut n'est pas dans le mapping, formater en remplaçant les underscores
    if (statusMapping[status]) {
      return statusMapping[status];
    }
    
    // Fallback: remplacer les underscores par des espaces et capitaliser
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // API Functions
  const approveGig = async (gigId: string) => {
    try {
      console.log('🟢 Approving gig:', gigId);
      const companyId = Cookies.get('companyId');
      const userId = Cookies.get('userId');
      const gigIdCookie = Cookies.get('gigId');
      
      console.log('🔑 Auth tokens:', { companyId, userId, gigId: gigIdCookie });
      
      if (!companyId || !userId) {
        throw new Error('Missing authentication tokens');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`;
      console.log('🌐 API URL:', apiUrl);
      
      const requestBody = {
        status: 'active'
      };
      console.log('📦 Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gigIdCookie}:${userId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to approve gig: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Gig approved successfully:', responseData);
      
      // Update the gig status locally instead of refreshing
      setGigs(prevGigs => prevGigs.map(gig => 
        gig._id === gigId ? { ...gig, status: 'active' } : gig
      ));
    } catch (error) {
      console.error('❌ Error approving gig:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve gig');
    }
  };

  const rejectGig = async (gigId: string) => {
    try {
      console.log('🔴 Rejecting gig:', gigId);
      const companyId = Cookies.get('companyId');
      const userId = Cookies.get('userId');
      const gigIdCookie = Cookies.get('gigId');
      
      console.log('🔑 Auth tokens:', { companyId, userId, gigId: gigIdCookie });
      
      if (!companyId || !userId) {
        throw new Error('Missing authentication tokens');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`;
      console.log('🌐 API URL:', apiUrl);
      
      const requestBody = {
        status: 'inactive'
      };
      console.log('📦 Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gigIdCookie}:${userId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to reject gig: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Gig rejected successfully:', responseData);
      
      // Update the gig status locally instead of refreshing
      setGigs(prevGigs => prevGigs.map(gig => 
        gig._id === gigId ? { ...gig, status: 'inactive' } : gig
      ));
    } catch (error) {
      console.error('❌ Error rejecting gig:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject gig');
    }
  };

  const fetchSkillsData = async (gigData: any) => {
    try {
      console.log('🔍 Fetching skills data for gig');
      
      // Collect skill IDs by category
      const professionalIds: string[] = [];
      const technicalIds: string[] = [];
      const softIds: string[] = [];
      
      console.log('🔍 Gig skills structure:', gigData.skills);
      
      if (gigData.skills?.professional) {
        gigData.skills.professional.forEach((skill: any) => {
          console.log('🔍 Professional skill object:', skill);
          // Try different possible structures
          const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
          if (skillId) {
            professionalIds.push(skillId);
            console.log('✅ Added professional skill ID:', skillId);
          } else {
            console.warn('⚠️ Could not extract professional skill ID from:', skill);
          }
        });
      }
      
      if (gigData.skills?.technical) {
        gigData.skills.technical.forEach((skill: any) => {
          console.log('🔍 Technical skill object:', skill);
          // Try different possible structures
          const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
          if (skillId) {
            technicalIds.push(skillId);
            console.log('✅ Added technical skill ID:', skillId);
          } else {
            console.warn('⚠️ Could not extract technical skill ID from:', skill);
          }
        });
      }
      
      if (gigData.skills?.soft) {
        gigData.skills.soft.forEach((skill: any) => {
          console.log('🔍 Soft skill object:', skill);
          // Try different possible structures
          const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
          if (skillId) {
            softIds.push(skillId);
            console.log('✅ Added soft skill ID:', skillId);
          } else {
            console.warn('⚠️ Could not extract soft skill ID from:', skill);
          }
        });
      }
      
      console.log('📋 Skills IDs by category:', {
        professional: professionalIds,
        technical: technicalIds,
        soft: softIds
      });
      
      const skillsDataMap: {[key: string]: any} = {};
      
      // Fetch professional skills
      if (professionalIds.length > 0) {
        try {
          const response = await fetch(`${import.meta.env.VITE_REP_API}/skills/professional`);
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Fetched professional skills response:', responseData);
            
            if (responseData.success && responseData.data) {
              const professionalSkills = responseData.data;
              console.log('✅ Professional skills data:', professionalSkills);
              
              professionalIds.forEach(skillId => {
                const skill = professionalSkills.find((s: any) => s._id === skillId);
                if (skill) {
                  skillsDataMap[skillId] = skill;
                  console.log(`✅ Matched professional skill ${skillId}:`, skill.name);
                } else {
                  console.warn(`⚠️ Professional skill ${skillId} not found`);
                }
              });
            } else {
              console.warn('⚠️ Invalid response format for professional skills');
            }
          } else {
            console.warn('⚠️ Failed to fetch professional skills');
          }
        } catch (error) {
          console.warn('⚠️ Error fetching professional skills:', error);
        }
      }
      
      // Fetch technical skills
      if (technicalIds.length > 0) {
        try {
          const response = await fetch(`${import.meta.env.VITE_REP_API}/skills/technical`);
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Fetched technical skills response:', responseData);
            
            if (responseData.success && responseData.data) {
              const technicalSkills = responseData.data;
              console.log('✅ Technical skills data:', technicalSkills);
              
              technicalIds.forEach(skillId => {
                const skill = technicalSkills.find((s: any) => s._id === skillId);
                if (skill) {
                  skillsDataMap[skillId] = skill;
                  console.log(`✅ Matched technical skill ${skillId}:`, skill.name);
                } else {
                  console.warn(`⚠️ Technical skill ${skillId} not found`);
                }
              });
            } else {
              console.warn('⚠️ Invalid response format for technical skills');
            }
          } else {
            console.warn('⚠️ Failed to fetch technical skills');
          }
        } catch (error) {
          console.warn('⚠️ Error fetching technical skills:', error);
        }
      }
      
      // Fetch soft skills
      if (softIds.length > 0) {
        try {
          const response = await fetch(`${import.meta.env.VITE_REP_API}/skills/soft`);
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Fetched soft skills response:', responseData);
            
            if (responseData.success && responseData.data) {
              const softSkills = responseData.data;
              console.log('✅ Soft skills data:', softSkills);
              
              softIds.forEach(skillId => {
                const skill = softSkills.find((s: any) => s._id === skillId);
                if (skill) {
                  skillsDataMap[skillId] = skill;
                  console.log(`✅ Matched soft skill ${skillId}:`, skill.name);
                } else {
                  console.warn(`⚠️ Soft skill ${skillId} not found`);
                }
              });
            } else {
              console.warn('⚠️ Invalid response format for soft skills');
            }
          } else {
            console.warn('⚠️ Failed to fetch soft skills');
          }
        } catch (error) {
          console.warn('⚠️ Error fetching soft skills:', error);
        }
      }
      
      setSkillsData(skillsDataMap);
      console.log('✅ All skills data fetched and set:', skillsDataMap);
    } catch (error) {
      console.error('❌ Error fetching skills data:', error);
    }
  };

  const fetchTimezoneData = async (gigData: any) => {
    try {
      console.log('🌍 Fetching timezone data for gig');
      
      // Get timezone ID from gig data
      const timezoneId = gigData.availability?.time_zone;
      console.log('🔍 Timezone ID from gig:', timezoneId);
      
      if (!timezoneId) {
        console.log('⚠️ No timezone ID found in gig data');
        return;
      }
      
      // Fetch timezone data from API
      try {
        const response = await fetch(`${import.meta.env.VITE_REP_API}/timezones`);
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Fetched timezones response:', responseData);
          
          if (responseData.success && responseData.data) {
            const timezones = responseData.data;
            console.log('✅ Timezones data:', timezones);
            
            // Find the matching timezone
            const timezone = timezones.find((tz: any) => tz._id === timezoneId);
            if (timezone) {
              setTimezoneData({ [timezoneId]: timezone });
              console.log(`✅ Matched timezone ${timezoneId}:`, timezone.zoneName);
            } else {
              console.warn(`⚠️ Timezone ${timezoneId} not found`);
            }
          } else {
            console.warn('⚠️ Invalid response format for timezones');
          }
        } else {
          console.warn('⚠️ Failed to fetch timezones');
        }
      } catch (error) {
        console.warn('⚠️ Error fetching timezones:', error);
      }
    } catch (error) {
      console.error('❌ Error fetching timezone data:', error);
    }
  };

  const fetchDestinationZoneData = async (gigData: any) => {
    try {
      console.log('🌍 Fetching destination zone data for gig');
      
      // Get destination zone from gig data
      const destinationZone = gigData.destination_zone;
      console.log('🔍 Destination zone from gig:', destinationZone);
      
      if (!destinationZone) {
        console.log('⚠️ No destination zone found in gig data');
        return;
      }
      
      // Fetch timezone data for the destination zone (using country code)
      try {
        // For now, we'll use FR as default, but this could be enhanced to map destination zones to country codes
        const countryCode = 'FR'; // This could be dynamic based on destination zone mapping
        const response = await fetch(`${import.meta.env.VITE_REP_API}/timezones/country/${countryCode}`);
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Fetched destination zone timezones response:', responseData);
          
          if (responseData.success && responseData.data && responseData.data.length > 0) {
            // Use the first element as specified
            const timezone = responseData.data[0];
            setTimezoneData(prev => ({ 
              ...prev, 
              0: timezone // Store as index 0 for easy access
            }));
            console.log(`✅ Set destination zone timezone:`, timezone.countryName);
          } else {
            console.warn('⚠️ Invalid response format for destination zone timezones');
          }
        } else {
          console.warn('⚠️ Failed to fetch destination zone timezones');
        }
      } catch (error) {
        console.warn('⚠️ Error fetching destination zone timezones:', error);
      }
    } catch (error) {
      console.error('❌ Error fetching destination zone data:', error);
    }
  };

  const archiveGig = async (gigId: string) => {
    try {
      console.log('📦 Archiving gig:', gigId);
      const companyId = Cookies.get('companyId');
      const userId = Cookies.get('userId');
      const gigIdCookie = Cookies.get('gigId');
      
      console.log('🔑 Auth tokens:', { companyId, userId, gigId: gigIdCookie });
      
      if (!companyId || !userId) {
        throw new Error('Missing authentication tokens');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`;
      console.log('🌐 API URL:', apiUrl);
      
      const requestBody = {
        status: 'archived'
      };
      console.log('📦 Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gigIdCookie}:${userId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to archive gig: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Gig archived successfully:', responseData);
      
      // Update the gig status locally instead of refreshing
      setGigs(prevGigs => prevGigs.map(gig => 
        gig._id === gigId ? { ...gig, status: 'archived' } : gig
      ));
    } catch (error) {
      console.error('❌ Error archiving gig:', error);
      setError(error instanceof Error ? error.message : 'Failed to archive gig');
    }
  };

  const previewGig = async (gigId: string) => {
    try {
      console.log('👁️ Previewing gig:', gigId);
      const companyId = Cookies.get('companyId');
      const userId = Cookies.get('userId');
      const gigIdCookie = Cookies.get('gigId');
      
      console.log('🔑 Auth tokens:', { companyId, userId, gigId: gigIdCookie });
      
      if (!companyId || !userId) {
        throw new Error('Missing authentication tokens');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${gigIdCookie}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to fetch gig details: ${response.status} ${response.statusText}`);
      }

      const gigData = await response.json();
      console.log('📋 Gig details for preview:', gigData);
      
      setCurrentGigData(gigData.data);
      
      // Fetch skills data for this gig
      await fetchSkillsData(gigData.data);
      
      // Fetch timezone data for this gig
      await fetchTimezoneData(gigData.data);
      
      // Fetch destination zone data for this gig
      await fetchDestinationZoneData(gigData.data);
      
      setCurrentView('preview');
    } catch (error) {
      console.error('❌ Error previewing gig:', error);
      setError(error instanceof Error ? error.message : 'Failed to preview gig');
    }
  };

  const editGig = async (gigId: string) => {
    try {
      console.log('✏️ Editing gig:', gigId);
      const companyId = Cookies.get('companyId');
      const userId = Cookies.get('userId');
      const gigIdCookie = Cookies.get('gigId');
      
      console.log('🔑 Auth tokens:', { companyId, userId, gigId: gigIdCookie });
      
      if (!companyId || !userId) {
        throw new Error('Missing authentication tokens');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`;
      console.log('🌐 API URL:', apiUrl);
      
      // First, get the current gig data
      const getResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${gigIdCookie}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', getResponse.status);

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to fetch gig details for editing: ${getResponse.status} ${getResponse.statusText}`);
      }

      const gigData = await getResponse.json();
      console.log('📋 Current gig data for editing:', gigData);
      
      setCurrentGigData(gigData.data);
      
      // Fetch skills data for this gig
      await fetchSkillsData(gigData.data);
      
      // Fetch timezone data for this gig
      await fetchTimezoneData(gigData.data);
      
      // Fetch destination zone data for this gig
      await fetchDestinationZoneData(gigData.data);
      
      setCurrentView('edit');
    } catch (error) {
      console.error('❌ Error editing gig:', error);
      setError(error instanceof Error ? error.message : 'Failed to edit gig');
    }
  };

  const approveSelectedGigs = async () => {
    console.log('🟢 Approving selected gigs:', selectedGigs);
    for (const gigId of selectedGigs) {
      await approveGig(gigId);
    }
    setSelectedGigs([]);
  };

  const rejectSelectedGigs = async () => {
    console.log('🔴 Rejecting selected gigs:', selectedGigs);
    for (const gigId of selectedGigs) {
      await rejectGig(gigId);
    }
    setSelectedGigs([]);
  };

  const backToMain = () => {
    setCurrentView('main');
    setCurrentGigData(null);
  };

  if (isLoading) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="rounded-lg bg-white shadow p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading gigs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="rounded-lg bg-white shadow p-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="mt-2 text-red-600">{error}</p>
            <button 
              onClick={fetchGigs}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering main component with', gigs.length, 'gigs');
  
  // Preview View
  if (currentView === 'preview' && currentGigData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={backToMain}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Approval
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Preview: {currentGigData.title}</h1>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Title:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Category:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.category || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{currentGigData.status}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Destination Zone:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {timezoneData[0]?.countryName || currentGigData.destination_zone || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Company:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.companyName || company?.name || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(currentGigData.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Updated:</span>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(currentGigData.updatedAt)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Description:</span>
              <p className="text-sm text-gray-900 mt-1">{currentGigData.description}</p>
            </div>
          </div>

          {/* Activities & Industries */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activities & Industries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Activities:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.activities?.map((activity: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {activity}
                    </span>
                  )) || <span className="text-sm text-gray-500">No activities specified</span>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Industries:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.industries?.map((industry: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {industry}
                    </span>
                  )) || <span className="text-sm text-gray-500">No industries specified</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Seniority */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seniority Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Level:</span>
                <p className="text-sm text-gray-900 mt-1">{currentGigData.seniority?.level || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Years of Experience:</span>
                <p className="text-sm text-gray-900 mt-1">{currentGigData.seniority?.yearsExperience || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Languages</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Professional Skills:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.skills?.professional?.map((skill: any, index: number) => {
                    const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
                    const skillName = skillsData[skillId]?.name || `Skill ${skillId || 'Unknown'}`;
                    return (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {skillName} (Level {skill.level || 'N/A'})
                      </span>
                    );
                  }) || <span className="text-sm text-gray-500">No professional skills specified</span>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Technical Skills:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.skills?.technical?.map((skill: any, index: number) => {
                    const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
                    const skillName = skillsData[skillId]?.name || `Skill ${skillId || 'Unknown'}`;
                    return (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {skillName} (Level {skill.level || 'N/A'})
                      </span>
                    );
                  }) || <span className="text-sm text-gray-500">No technical skills specified</span>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Soft Skills:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.skills?.soft?.map((skill: any, index: number) => {
                    const skillId = skill.skill?.$oid || skill.skill?._id || skill.skill || skill._id;
                    const skillName = skillsData[skillId]?.name || `Skill ${skillId || 'Unknown'}`;
                    return (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        {skillName} (Level {skill.level || 'N/A'})
                      </span>
                    );
                  }) || <span className="text-sm text-gray-500">No soft skills specified</span>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Languages:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentGigData.skills?.languages?.map((lang: any, index: number) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {lang.language} ({lang.proficiency})
                    </span>
                  )) || <span className="text-sm text-gray-500">No languages specified</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule & Availability</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Time Zone:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {(() => {
                      const timezoneId = currentGigData.availability?.time_zone;
                      const timezone = timezoneData[timezoneId];
                      return timezone ? `${timezone.zoneName} (${timezone.countryName})` : (timezoneId || 'Not specified');
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Flexibility:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentGigData.availability?.flexibility?.map((flex: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {flex}
                      </span>
                    )) || <span className="text-sm text-gray-500">No flexibility options specified</span>}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Weekly Schedule:</span>
                <div className="mt-2 space-y-2">
                  {currentGigData.availability?.schedule?.map((day: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-900">{day.day}</span>
                      <span className="text-sm text-gray-600">{day.hours.start} - {day.hours.end}</span>
                    </div>
                  )) || <span className="text-sm text-gray-500">No schedule specified</span>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Minimum Hours (Daily):</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.availability?.minimumHours?.daily || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Minimum Hours (Weekly):</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.availability?.minimumHours?.weekly || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Minimum Hours (Monthly):</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.availability?.minimumHours?.monthly || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Commission */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Commission & Compensation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Base:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.base || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Base Amount:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.baseAmount ? `${currentGigData.commission.currency} ${currentGigData.commission.baseAmount}` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Bonus:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.bonus || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Bonus Amount:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.bonusAmount ? `${currentGigData.commission.currency} ${currentGigData.commission.bonusAmount}` : 'Not specified'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Transaction Commission:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.transactionCommission?.type || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Commission Amount:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.transactionCommission?.amount ? `${currentGigData.commission.currency} ${currentGigData.commission.transactionCommission.amount}` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Minimum Volume:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.commission?.minimumVolume?.amount ? `${currentGigData.commission.minimumVolume.amount} ${currentGigData.commission.minimumVolume.unit} ${currentGigData.commission.minimumVolume.period}` : 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Structure</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Team Size:</span>
                  <p className="text-sm text-gray-900 mt-1">{currentGigData.team?.size || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Territories:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentGigData.team?.territories?.map((territory: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {territory}
                      </span>
                    )) || <span className="text-sm text-gray-500">No territories specified</span>}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Team Structure:</span>
                <div className="mt-2 space-y-2">
                  {currentGigData.team?.structure?.map((role: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-900">{role.roleId} ({role.count})</span>
                      <span className="text-sm text-gray-600">{role.seniority?.level} - {role.seniority?.yearsExperience} years</span>
                    </div>
                  )) || <span className="text-sm text-gray-500">No team structure specified</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          {currentGigData.issues && currentGigData.issues.length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-4">Issues Requiring Attention</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-700">
                {currentGigData.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit View
  if (currentView === 'edit' && currentGigData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={backToMain}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Approval
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Edit: {currentGigData.title}</h1>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Gig Title
                </label>
                <input
                  type="text"
                  id="title"
                  defaultValue={currentGigData.title}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  defaultValue={currentGigData.description}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    id="category"
                    defaultValue={currentGigData.category}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="destination_zone" className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Zone
                  </label>
                  <input
                    type="text"
                    id="destination_zone"
                    defaultValue={currentGigData.destination_zone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {timezoneData[0] && (
                    <p className="mt-1 text-xs text-gray-500">
                      Country: {timezoneData[0].countryName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activities & Industries */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activities & Industries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="activities" className="block text-sm font-medium text-gray-700 mb-2">
                  Activities (comma separated)
                </label>
                <input
                  type="text"
                  id="activities"
                  defaultValue={currentGigData.activities?.join(', ')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="industries" className="block text-sm font-medium text-gray-700 mb-2">
                  Industries (comma separated)
                </label>
                <input
                  type="text"
                  id="industries"
                  defaultValue={currentGigData.industries?.join(', ')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Seniority */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seniority Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="seniority_level" className="block text-sm font-medium text-gray-700 mb-2">
                  Seniority Level
                </label>
                <select
                  id="seniority_level"
                  defaultValue={currentGigData.seniority?.level}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select level</option>
                  <option value="Entry-Level">Entry-Level</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div>
                <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  id="years_experience"
                  defaultValue={currentGigData.seniority?.yearsExperience}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Commission */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Commission & Compensation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="base_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Base Type
                  </label>
                  <input
                    type="text"
                    id="base_type"
                    defaultValue={currentGigData.commission?.base}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="base_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Base Amount
                  </label>
                  <input
                    type="text"
                    id="base_amount"
                    defaultValue={currentGigData.commission?.baseAmount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="bonus_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus Type
                  </label>
                  <input
                    type="text"
                    id="bonus_type"
                    defaultValue={currentGigData.commission?.bonus}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="bonus_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus Amount
                  </label>
                  <input
                    type="text"
                    id="bonus_amount"
                    defaultValue={currentGigData.commission?.bonusAmount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="commission_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Type
                  </label>
                  <input
                    type="text"
                    id="commission_type"
                    defaultValue={currentGigData.commission?.transactionCommission?.type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="commission_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Amount
                  </label>
                  <input
                    type="text"
                    id="commission_amount"
                    defaultValue={currentGigData.commission?.transactionCommission?.amount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    id="currency"
                    defaultValue={currentGigData.commission?.currency}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select currency</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Structure</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="team_size" className="block text-sm font-medium text-gray-700 mb-2">
                  Team Size
                </label>
                <input
                  type="number"
                  id="team_size"
                  defaultValue={currentGigData.team?.size}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="territories" className="block text-sm font-medium text-gray-700 mb-2">
                  Territories (comma separated)
                </label>
                <input
                  type="text"
                  id="territories"
                  defaultValue={currentGigData.team?.territories?.join(', ')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule & Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <input
                  type="text"
                  id="timezone"
                  defaultValue={currentGigData.availability?.time_zone}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="flexibility" className="block text-sm font-medium text-gray-700 mb-2">
                  Flexibility (comma separated)
                </label>
                <input
                  type="text"
                  id="flexibility"
                  defaultValue={currentGigData.availability?.flexibility?.join(', ')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Hours
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="min_hours_daily" className="block text-xs font-medium text-gray-500 mb-1">
                    Daily
                  </label>
                  <input
                    type="number"
                    id="min_hours_daily"
                    defaultValue={currentGigData.availability?.minimumHours?.daily}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="min_hours_weekly" className="block text-xs font-medium text-gray-500 mb-1">
                    Weekly
                  </label>
                  <input
                    type="number"
                    id="min_hours_weekly"
                    defaultValue={currentGigData.availability?.minimumHours?.weekly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="min_hours_monthly" className="block text-xs font-medium text-gray-500 mb-1">
                    Monthly
                  </label>
                  <input
                    type="number"
                    id="min_hours_monthly"
                    defaultValue={currentGigData.availability?.minimumHours?.monthly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={backToMain}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main View
  return (
    <div className="space-y-6">
      {/* Back to Onboarding Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              console.log('⬅️ Back to onboarding clicked');
              // Navigation logic would go here
              window.history.back();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Onboarding
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
            onClick={approveSelectedGigs}
          >
            Approve Selected
          </button>
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
            onClick={rejectSelectedGigs}
          >
            Reject Selected
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-1 rounded-lg bg-white p-1 shadow">
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: all');
            setFilter('all');
          }}
        >
          All
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: pending');
            setFilter('pending');
          }}
        >
          To active
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'approved' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: approved');
            setFilter('approved');
          }}
        >
          Active
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'rejected' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: rejected');
            setFilter('rejected');
          }}
        >
          Inactive
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'archived' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: archived');
            setFilter('archived');
          }}
        >
          Archived
        </button>
      </div>

      {/* Gigs for Approval */}
      <div className="rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <button onClick={selectAllGigs}>
              {selectedGigs.length === filteredGigs.length && filteredGigs.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-indigo-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <span className="font-medium text-gray-700">
              {selectedGigs.length} of {filteredGigs.length} selected
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {filteredGigs.filter(g => g.status === 'pending').length} pending approval
          </div>
        </div>

        {filteredGigs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No gigs found matching the current filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredGigs.map((gig) => (
              <div key={gig._id} className="hover:bg-gray-50">
                <div className="flex items-center p-4">
                  <div className="mr-3">
                    <button onClick={() => toggleSelectGig(gig._id)}>
                      {selectedGigs.includes(gig._id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div 
                    className="flex flex-1 cursor-pointer items-center justify-between"
                    onClick={() => toggleGig(gig._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{gig.title}</h3>
                        <p className="text-sm text-gray-500">
                          {gig.category || 'No category'}
                          {gig.budget && ` • ${gig.budget}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {(gig.status === 'pending' || gig.status === 'to_activate' || gig.status === 'draft' || gig.status === 'submitted') && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          {gig.status === 'to_activate' ? 'To active' : formatStatus(gig.status)}
                        </span>
                      )}
                      {(gig.status === 'approved' || gig.status === 'active' || gig.status === 'published') && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {formatStatus(gig.status)}
                        </span>
                      )}
                      {(gig.status === 'rejected' || gig.status === 'declined' || gig.status === 'cancelled' || gig.status === 'inactive') && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          {formatStatus(gig.status)}
                        </span>
                      )}
                      {gig.status === 'archived' && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatStatus(gig.status)}
                        </span>
                      )}
                      {expandedGig === gig._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedGig === gig._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Company</p>
                        <p className="text-sm font-medium text-gray-900">{company?.name || gig.submittedBy || 'Company'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Created</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(gig.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Status</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{gig.status}</p>
                      </div>
                    </div>
                    
                    {gig.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500">Description</p>
                        <p className="text-sm text-gray-900 mt-1">{gig.description}</p>
                      </div>
                    )}
                    
                    {gig.issues && gig.issues.length > 0 && (
                      <div className="mb-4 rounded-md bg-yellow-50 p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Issues Requiring Attention</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <ul className="list-disc space-y-1 pl-5">
                                {gig.issues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => previewGig(gig._id)}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </button>
                      <button 
                        onClick={() => editGig(gig._id)}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </button>
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Comment
                      </button>
                      
                      {/* Boutons d'action selon le statut actuel */}
                      {(gig.status === 'pending' || gig.status === 'to_activate' || gig.status === 'draft' || gig.status === 'submitted') && (
                        <>
                          <button 
                            onClick={() => approveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Active
                          </button>
                          <button 
                            onClick={() => rejectGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Inactive
                          </button>
                          <button 
                            onClick={() => archiveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Archived
                          </button>
                        </>
                      )}
                      
                      {(gig.status === 'approved' || gig.status === 'active' || gig.status === 'published') && (
                        <>
                          <button 
                            onClick={() => rejectGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Inactive
                          </button>
                          <button 
                            onClick={() => archiveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Archived
                          </button>
                        </>
                      )}
                      
                      {(gig.status === 'rejected' || gig.status === 'declined' || gig.status === 'cancelled' || gig.status === 'inactive') && (
                        <>
                          <button 
                            onClick={() => approveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Active
                          </button>
                          <button 
                            onClick={() => archiveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Archived
                          </button>
                        </>
                      )}
                      
                      {gig.status === 'archived' && (
                        <>
                          <button 
                            onClick={() => approveGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Active
                          </button>
                          <button 
                            onClick={() => rejectGig(gig._id)}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Inactive
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publishing Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Publishing Settings</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Automatic Publishing</h3>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="auto-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="auto-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Publish immediately after approval
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="schedule-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="schedule-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Schedule publishing
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="manual-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="manual-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Manual publishing only
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700">Approval Requirements</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="req-complete-profile"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-complete-profile" className="ml-2 text-sm text-gray-700">
                  Complete profile information
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-budget"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-budget" className="ml-2 text-sm text-gray-700">
                  Budget details specified
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-timeline"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-timeline" className="ml-2 text-sm text-gray-700">
                  Timeline/deadline included
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-skills"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-skills" className="ml-2 text-sm text-gray-700">
                  Required skills listed
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-outcomes"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-outcomes" className="ml-2 text-sm text-gray-700">
                  Clear deliverables/outcomes
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPublishing;