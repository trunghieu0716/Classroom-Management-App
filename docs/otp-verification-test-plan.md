# OTP Verification Test Plan

## Overview

This document outlines the test plan for verifying that the OTP verification process correctly redirects users to the Student Dashboard after successful authentication.

## Test Cases

### Test Case 1: Normal Student Login Flow

**Objective**: Verify that a student can log in with their email, receive an OTP code, and be redirected to the dashboard after verification.

**Steps**:

1. Navigate to the home page
2. Select "Student" login type
3. Enter a valid student email address and submit
4. Verify OTP code is received (check console in development)
5. Enter the OTP code and click "Verify Code"
6. Observe the redirect to the Student Dashboard

**Expected Result**:

- After successful OTP verification, user should be immediately redirected to Student Dashboard
- localStorage should contain authToken, authUser, and userType values
- The dashboard should display the student's information

### Test Case 2: Login from Account Setup Link

**Objective**: Verify that a student can complete account setup and then log in with OTP verification.

**Steps**:

1. Open a student setup link with token parameter (e.g., `http://localhost:5173/student-setup?token=...`)
2. Complete the account setup process
3. After setup completion, enter the OTP code sent to email
4. Verify redirect to Student Dashboard

**Expected Result**:

- After account setup and OTP verification, user should be immediately redirected to Student Dashboard
- The dashboard should display the correct student information

### Test Case 3: Authentication State Persistence

**Objective**: Verify that authentication state persists after page reload.

**Steps**:

1. Complete the login process with OTP verification
2. Refresh the browser page after successful login
3. Observe that the user remains on the Student Dashboard without needing to log in again

**Expected Result**:

- User should remain authenticated after page reload
- Dashboard should display immediately without requiring re-authentication

### Test Case 4: Direct Navigation with setupComplete Parameter

**Objective**: Verify that navigation works properly when using setupComplete URL parameter.

**Steps**:

1. Navigate to `http://localhost:5173/?setupComplete=true&email=student@example.com`
2. Observe that the login form is pre-filled with the email
3. Request OTP verification code
4. Enter code and verify
5. Observe redirect to Student Dashboard

**Expected Result**:

- Email should be pre-filled
- After OTP verification, user should be redirected to Student Dashboard

## Debugging Tips

If redirection is not working properly, check the following:

1. **Console Logs**: Check for error messages or authentication flow logs in the browser console
2. **localStorage**: Verify that `authToken`, `authUser`, and `userType` are correctly set in localStorage
3. **State Management**: Use React DevTools to inspect the AuthContext state after OTP verification
4. **Network Requests**: Check network tab for successful API responses during OTP verification

## Required Browser Storage Values

After successful authentication, the following items should exist in localStorage:

- `authToken`: JWT token from the server
- `authUser`: JSON string containing user data
- `userType`: Should be set to "student"
- `userId`: The student's ID or email address

## Fix Verification

To confirm the fix is working:

1. Log in using the student email flow
2. Check that OTP verification completes without errors
3. Verify immediate redirect to Student Dashboard after OTP verification
4. Check localStorage values for proper authentication data
5. Verify that dashboard correctly displays student information
