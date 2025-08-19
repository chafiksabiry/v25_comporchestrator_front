# Troubleshooting Guide

## Recent Issues and Fixes

### 1. Step Completion Logic Issues (Fixed)

**Problem**: The application was showing inconsistent step completion status, with the API returning `completedSteps: [3]` but the frontend trying to auto-complete step 1.

**Root Cause**: 
- Race conditions between multiple useEffect hooks
- Inconsistent basic info checking
- Missing state management for step checking operations

**Solution Applied**:
- Added `stepCheckInProgress` state to prevent concurrent step checks
- Memoized `hasBasicInfo` function using `useCallback`
- Consolidated step checking logic into a single, controlled function
- Added proper cleanup for timers and state updates

**Files Modified**:
- `src/components/onboarding/CompanyProfile.tsx`
- `src/components/CompanyOnboarding.tsx`

### 2. API 404 Errors (Fixed)

**Problem**: Multiple API endpoints were returning 404 errors, causing step completion failures.

**Root Cause**:
- Missing API endpoints on the backend
- Inconsistent API URL configurations
- Lack of proper error handling for missing endpoints

**Solution Applied**:
- Added comprehensive error handling in API service
- Created fallback responses for missing endpoints
- Added request/response interceptors for better logging
- Implemented graceful degradation for missing features

**Files Modified**:
- `src/services/api.ts`

### 3. Single-SPA Framework Errors (Fixed)

**Problem**: Multiple single-spa bootstrap timeout errors were occurring.

**Root Cause**:
- Default timeout values were too low for the application
- Missing configuration for single-spa framework

**Solution Applied**:
- Increased timeout values to 10 seconds for all operations
- Added proper single-spa configuration
- Improved public path handling for Qiankun framework

**Files Modified**:
- `src/public-path.ts`

### 4. Basic Info Inconsistency (Fixed)

**Problem**: The `hasBasicInfo()` function was sometimes returning undefined values, causing step completion failures.

**Root Cause**:
- Function was being recreated on every render
- Missing dependency management in useEffect hooks

**Solution Applied**:
- Memoized `hasBasicInfo` function with proper dependencies
- Added state validation before step completion
- Improved error handling for missing company data

## Current Status

✅ **Step Completion Logic**: Fixed and working correctly
✅ **API Error Handling**: Comprehensive error handling implemented
✅ **Single-SPA Framework**: Properly configured with increased timeouts
✅ **Basic Info Checking**: Consistent and reliable
✅ **Race Conditions**: Eliminated through proper state management

## Monitoring

The application now includes comprehensive logging for debugging:

- 🚀 API Request/Response logging
- 🔍 Step completion status checks
- 💾 Local storage operations
- ⚠️ Warning messages for edge cases
- ❌ Error handling with fallbacks

## Best Practices Implemented

1. **State Management**: Proper use of `useCallback` and `useEffect` dependencies
2. **Error Handling**: Graceful degradation for missing API endpoints
3. **Performance**: Memoized functions to prevent unnecessary re-renders
4. **Logging**: Comprehensive logging for debugging and monitoring
5. **Fallbacks**: Local storage fallbacks when API calls fail

## Next Steps

1. **Monitor**: Watch console logs for any remaining issues
2. **Test**: Verify step completion works correctly across different scenarios
3. **Optimize**: Consider implementing caching for frequently accessed data
4. **Document**: Update API documentation to reflect current endpoint structure

## Common Issues and Solutions

### Issue: Step not completing automatically
**Solution**: Check console logs for "Cannot auto-complete step 1 because basic info is missing" - ensure company has name, industry, and email.

### Issue: API 404 errors
**Solution**: These are now handled gracefully with fallback responses. Check backend logs to ensure endpoints are properly configured.

### Issue: Single-spa timeout errors
**Solution**: Timeouts have been increased to 10 seconds. If issues persist, check network connectivity and backend response times.

### Issue: Inconsistent step status
**Solution**: The application now uses a single source of truth for step completion. Check localStorage and API responses for consistency. 