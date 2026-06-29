# Authentication Flow

## Pre-conditions
- User account exists or will be created
- Email service configured (SMTP)
- JWT secrets configured

## Role Context
- Authentication happens before workspace context
- Roles (Owner/Manager/Reviewer/Member) assigned per workspace
- User can have different roles in different workspaces

## User Scenarios

### 1. New User Registration
1. User visits `/auth/signup`
2. Fills in name, email, password, confirm password
3. Password strength indicator shows in real-time
4. Clicks "Create account"
5. System creates account and sends verification email
6. User redirected to workspace chooser (multi-workspace mode) or dashboard (single workspace)

### 2. Email Verification
1. User sees yellow banner: "Please verify your email address"
2. Clicks "Resend verification email"
3. System sends new verification email
4. User clicks link in email
5. Email verified, banner disappears

### 3. Sign In
1. User visits `/auth/signin`
2. Enters email and password
3. Clicks "Sign in"
4. If multi-workspace: redirected to workspace chooser
5. If single workspace: redirected to dashboard

### 4. Forgot Password
1. User clicks "Forgot password?" on sign-in page
2. Enters email address
3. Receives password reset email
4. Clicks link, enters new password
5. Password updated, redirected to sign-in

### 5. Workspace Invitation (Logged Out)
1. User receives invitation email with link
2. Clicks link, directed to `/auth/invite?token=xxx`
3. Creates account with pre-filled email
4. Joins workspace automatically

### 6. Workspace Invitation (Logged In)
1. User receives invitation email
2. Clicks link while logged in
3. Account added to workspace immediately

### 7. Sign Out
1. User clicks account menu → Sign out
2. Session cleared, refresh token deleted
3. Redirected to sign-in page

### 8. Session Refresh
1. Access token expires (15 min)
2. Background refresh via `/auth/refresh`
3. New access token issued
4. User continues without interruption

## Edge Cases
- **Rate limiting**: 5 failed attempts triggers 15-minute lockout
- **Session expiry**: Auto-refresh via `/auth/refresh` endpoint
- **Concurrent sessions**: Multiple sessions supported, visible in Security tab
- **Invalid token**: Redirect to sign-in with error message
