# Authentication System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Environment Variables
Create or update `.env.local`:
```bash
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 2. Create Owner Account
```bash
npm run seed
```
This creates an owner account. Update the credentials in `scripts/seed-owner.js` for production.

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Test Login
- Navigate to `http://localhost:5173/login`
- Use the credentials from the seed script
- Should redirect to dashboard on success

---

## 📁 New Files Created

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Login page UI & authentication logic |
| `src/components/ProtectedRoute.tsx` | Route wrapper for protected pages |
| `scripts/user-management.js` | Helper functions for user creation/management |
| `scripts/seed-users.js` | Example: Create additional users |
| `AUTH_SETUP.md` | Detailed authentication setup guide |
| `AUTHENTICATION_IMPLEMENTATION.md` | Complete technical documentation |

---

## 📝 Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useAuth.ts` | Added `logout()` function to AuthState |
| `src/components/AppSidebar.tsx` | Added user profile display & logout button |
| `src/App.tsx` | Added login route & protected route wrapper |
| `package.json` | Added `seed:users` npm script |

---

## 🔑 Key Features Implemented

### ✅ Authentication
- Login with username/password
- Secure password hashing (Supabase bcrypt)
- Session management via Supabase Auth
- Logout functionality

### ✅ Route Protection
- All app routes protected from unauthenticated access
- Public login page accessible to everyone
- Automatic redirect to login for unauthorized access
- Loading state while checking authentication

### ✅ User Experience
- Remember Me checkbox (stores username locally)
- Toast notifications for feedback
- Validation for empty fields
- Clear error messages
- User info displayed in sidebar footer
- Smooth loading indicators

### ✅ Code Quality
- TypeScript throughout
- Comprehensive comments
- Follows project conventions
- Uses existing UI components

---

## 👥 Creating Additional Users

### Method 1: Edit & Run Seed Script
```bash
# Edit scripts/seed-users.js with new usernames
# Then run:
npm run seed:users
```

### Method 2: Programmatic via Helper Functions
```typescript
import { createUserWithAdmin } from './scripts/user-management.js';

const userId = await createUserWithAdmin(
  'john_doe',        // username
  'SecurePass123!',  // password
  'John Doe',        // full name
  'cashier',         // role: 'owner' or 'cashier'
  '08123456789'      // phone (optional)
);
```

---

## 🔒 Security Checklist

- [x] Passwords hashed by Supabase (bcrypt)
- [x] Session tokens secured by Supabase
- [x] Routes protected from unauthorized access
- [x] Logout clears session server-side
- [x] No sensitive data in localStorage (just username)
- [x] HTTPS ready for production
- [x] RLS policies on database

---

## 📊 Architecture

```
Login Flow:
User → Login Page → Enter Credentials → Verify Profile Exists 
→ Authenticate with Supabase → Create Session → Redirect to Dashboard

Protected Route Flow:
User Accesses Route → Check useAuth Hook → Session Valid? 
→ YES: Render Page → NO: Redirect to Login
```

---

## 🧪 Testing the System

```
✓ Go to /login - should show login form
✓ Submit empty form - shows validation error
✓ Enter wrong username - shows error
✓ Enter wrong password - shows error
✓ Enter correct credentials - redirects to /
✓ Check sidebar shows your name and role
✓ Click logout - redirects to login
✓ Go to /products while logged out - redirects to login
✓ Login again - works normally
✓ Try Remember Me - reloads and keeps username filled
```

---

## 📖 Documentation Files

- **Quick Reference**: This file (`LOGIN_QUICK_START.md`)
- **Setup Guide**: `AUTH_SETUP.md` - Comprehensive setup instructions
- **Technical Details**: `AUTHENTICATION_IMPLEMENTATION.md` - Full implementation details

---

## ❓ Troubleshooting

### "Invalid username or password"
- Verify user was created via seed script
- Check username exists in profiles table
- Usernames are case-sensitive

### Stuck on loading spinner
- Check browser console for errors
- Verify `.env.local` variables are correct
- Try hard refresh: Ctrl+Shift+R

### Logout not working
- Check browser console
- Verify profile exists in database
- Try clearing localStorage

### Remember Me not saving
- Check localStorage is enabled
- Try non-private browsing mode

---

## 🎯 Next Steps

1. [x] ✅ Implement login system
2. [x] ✅ Add logout functionality
3. [x] ✅ Protect routes
4. [ ] 📋 (Optional) Implement password reset
5. [ ] 📋 (Optional) Add user management dashboard
6. [ ] 📋 (Optional) Add 2-factor authentication

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review `AUTH_SETUP.md` for detailed setup info
3. Check browser console for error messages
4. Verify Supabase project is properly configured

---

**Last Updated**: March 26, 2026
**Status**: Production Ready ✅
