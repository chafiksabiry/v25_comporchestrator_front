import Cookies from 'js-cookie';

/**
 * Decode JWT token to get user information
 */
export const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[UserUtils] Error decoding token:', error);
    return null;
  }
};

/**
 * Get current user name from token or cookies
 */
export const getCurrentUserName = (): string => {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      const userInfo = decodeToken(token);
      if (userInfo) {
        return userInfo.fullName || userInfo.name || userInfo.email || 'User';
      }
    }
    
    // Fallback to cookie if available
    const userName = Cookies.get('userName');
    if (userName) {
      return userName;
    }
    
    return 'User';
  } catch (error) {
    console.error('[UserUtils] Error getting user name:', error);
    return 'User';
  }
};

/**
 * Get current user email from token
 */
export const getCurrentUserEmail = (): string => {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      const userInfo = decodeToken(token);
      if (userInfo) {
        return userInfo.email || '';
      }
    }
    return '';
  } catch (error) {
    console.error('[UserUtils] Error getting user email:', error);
    return '';
  }
};

/**
 * Get agentId from cookies
 * Returns the agentId if found in cookies, null otherwise
 */
export const getAgentId = (): string | null => {
  // Try to get agentId from cookies
  const agentIdFromCookie = Cookies.get('agentId');
  if (agentIdFromCookie) {
    console.log('[UserUtils] AgentId found in cookies:', agentIdFromCookie);
    return agentIdFromCookie.trim();
  }

  // Fallback: try to get from localStorage profileData
  try {
    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
      const profileData = JSON.parse(profileDataString);
      const agentIdFromProfile = profileData._id;
      
      if (agentIdFromProfile) {
        console.log('[UserUtils] AgentId found in profileData:', agentIdFromProfile);
        return agentIdFromProfile;
      }
    }
  } catch (error) {
    console.error('[UserUtils] Error reading profileData from localStorage:', error);
  }

  console.warn('[UserUtils] AgentId not found in cookies or localStorage');
  return null;
};

/**
 * Get userId from cookies
 * Returns the userId if found in cookies, null otherwise
 */
export const getUserId = (): string | null => {
  const userId = Cookies.get('userId');
  if (userId) {
    console.log('[UserUtils] UserId found in cookies:', userId);
    return userId.trim();
  }
  console.warn('[UserUtils] UserId not found in cookies');
  return null;
};

/**
 * Get user type (typeUser) from registration API
 * Returns 'company', 'rep', or null
 */
export const getUserType = async (): Promise<'company' | 'rep' | null> => {
  try {
    const userId = getUserId();
    if (!userId) {
      console.warn('[UserUtils] No userId found, cannot check user type');
      return null;
    }

    // Try to get from cache first (localStorage)
    const cachedType = localStorage.getItem('userType');
    if (cachedType === 'company' || cachedType === 'rep') {
      console.log('[UserUtils] UserType found in cache:', cachedType);
      return cachedType as 'company' | 'rep';
    }

    // Fetch from registration API
    const registrationApiUrl = import.meta.env.VITE_REGISTRATION_API_URL || 'http://localhost:5000';
    const response = await fetch(`${registrationApiUrl}/auth/check-user-type`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.warn('[UserUtils] Failed to fetch user type:', response.status);
      return null;
    }

    const data = await response.json();
    const userType = data.userType || data.typeUser;

    if (userType === 'company' || userType === 'rep') {
      // Cache the result
      localStorage.setItem('userType', userType);
      console.log('[UserUtils] UserType fetched from API:', userType);
      return userType;
    }

    console.warn('[UserUtils] Invalid user type received:', userType);
    return null;
  } catch (error) {
    console.error('[UserUtils] Error fetching user type:', error);
    return null;
  }
};

