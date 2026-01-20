# Troubleshooting Guide

## Common Issues and Solutions

### 1. Company ID Undefined Error

**Error Message:**
```
PUT https://v25searchcompanywizardbackend-production.up.railway.app/api/onboarding/companies/undefined/onboarding/phases/2/steps/5 500 (Internal Server Error)
```

**Cause:**
The `companyId` cookie is missing or not properly set when making API calls.

**Solutions:**

#### A. Check Cookie Storage
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Check if `companyId` cookie exists
4. If missing, refresh the page or log in again

#### B. Verify Environment Variables
Ensure these environment variables are properly set:
```env
VITE_COMPANY_API_URL=https://v25searchcompanywizardbackend-production.up.railway.app
VITE_DASHBOARD_API=https://your-dashboard-api.com
VITE_GIGS_API=https://your-gigs-api.com
```

#### C. Check Authentication Flow
1. Ensure user is properly authenticated
2. Verify that company ID is fetched after login
3. Check if the user has an associated company

#### D. Development Mode
In development mode, the system uses a default company ID:
```javascript
if (import.meta.env.VITE_NODE_ENV === 'development') {
  const devCompanyId = '6830839c641398dc582eb897';
  setCompanyId(devCompanyId);
  Cookies.set('companyId', devCompanyId);
}
```

### 2. OpenAI API Issues

**Error Messages:**
- "OpenAI API key not configured"
- "OpenAI API error"
- "Invalid response format from OpenAI"

**Solutions:**

#### A. Check API Key
1. Verify `VITE_OPENAI_API_KEY` is set in `.env` file
2. Ensure the API key is valid and has sufficient credits
3. Test the connection using the "Test Connection" button

#### B. Network Issues
1. Check internet connectivity
2. Verify firewall settings
3. Ensure the API endpoint is accessible

### 3. File Upload Issues

**Common Problems:**
- File format not supported
- File too large
- Processing timeout

**Solutions:**

#### A. File Format
Supported formats:
- CSV files (.csv)
- Excel files (.xlsx, .xls)

#### B. File Size
- Maximum file size: 10MB
- Consider splitting large files

#### C. File Content
- Ensure headers are properly formatted
- Check for special characters
- Verify data consistency

### 4. Zoho Integration Issues

**Error Messages:**
- "Configuration Zoho non trouvée"
- "Failed to complete Zoho authentication"

**Solutions:**

#### A. Authentication
1. Complete Zoho OAuth flow
2. Verify access tokens are valid
3. Check refresh token expiration

#### B. API Permissions
1. Ensure Zoho CRM API access is enabled
2. Verify API scopes are correct
3. Check rate limits

### 5. General Troubleshooting Steps

#### A. Clear Browser Data
1. Clear cookies and local storage
2. Refresh the page
3. Log in again

#### B. Check Console Logs
1. Open browser developer tools
2. Check for JavaScript errors
3. Look for network request failures

#### C. Verify API Endpoints
1. Test API endpoints directly
2. Check server status
3. Verify CORS settings

#### D. Environment Variables
1. Ensure all required variables are set
2. Check for typos in variable names
3. Verify URLs are correct

### 6. Development vs Production

#### Development Mode
- Uses default company ID
- More verbose error messages
- Local API endpoints

#### Production Mode
- Requires proper authentication
- Fetches company ID from API
- Production API endpoints

### 7. Getting Help

If you continue to experience issues:

1. **Check the console logs** for detailed error messages
2. **Verify your environment setup** matches the documentation
3. **Test with a fresh browser session**
4. **Contact support** with specific error messages and steps to reproduce

## Prevention Tips

1. **Always check for required data** before making API calls
2. **Implement proper error handling** in all async operations
3. **Validate user input** before processing
4. **Use try-catch blocks** for all external API calls
5. **Log important operations** for debugging 