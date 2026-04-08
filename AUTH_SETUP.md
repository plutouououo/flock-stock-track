/**
 * Authentication Setup Guide
 * ==========================
 * 
 * This document explains how the authentication system works and how to set up new users.
 * 
 * ## System Architecture
 * 
 * The authentication system uses Supabase Auth with custom profiles management:
 * - `auth.users`: Supabase built-in table for authentication (email/password)
 * - `profiles`: Custom table linked to auth.users via UUID (id)
 * 
 * Fields in profiles table:
 * - id: UUID (references auth.users.id)
 * - role: 'owner' | 'cashier'
 * - full_name: User's full name
 * - username: Unique username for login
 * - phone: User's phone number (optional)
 * - created_at: Creation timestamp
 * - updated_at: Last update timestamp
 * 
 * ## How Login Works
 * 
 * 1. User enters username and password on the login page
 * 2. System looks up the profile with matching username
 * 3. System attempts Supabase sign-in with: email="{username}@poultrymart.local", password
 * 4. On success, user is redirected to dashboard
 * 5. Session is maintained via Supabase auth state
 * 
 * ## Creating New Users
 * 
 * There are two approaches:
 * 
 * ### Option 1: Using the Seed Script (Recommended for Admin Setup)
 * 
 * The `/scripts/seed-owner.js` script demonstrates creating users with admin privileges.
 * This requires the SUPABASE_SERVICE_ROLE_KEY environment variable.
 * 
 * Example:
 * ```bash
 * npm run seed
 * ```
 * 
 * To create additional users, modify or duplicate the seed script with:
 * - email: "{username}@poultrymart.local"
 * - password: A secure password (ideally generated and shown to user once)
 * - username: The username from the profiles table
 * - role: 'owner' or 'cashier'
 * - full_name: User's full name
 * 
 * ### Option 2: Admin User Management Page (Optional)
 * 
 * You could create an admin page that allows authorized users (owner) to:
 * - Create new users
 * - Reset passwords
 * - View user activity
 * 
 * This would require:
 * 1. Creating a new page: /src/pages/UserManagement.tsx
 * 2. Using Supabase Admin API via a backend function
 * 3. Restricting access to owner role only
 * 
 * ## Database Setup
 * 
 * The profiles table is already created via migration 001_initial_schema.sql.
 * RLS (Row Level Security) is enabled on the profiles table.
 * 
 * ### RLS Policies to Consider
 * 
 * - Users can read their own profile
 * - Only owners can create/update/delete any profile
 * - Service role key can bypass RLS for admin operations
 * 
 * ## Security Features
 * 
 * ✓ Passwords are hashed by Supabase (bcrypt)
 * ✓ Session tokens are secure and HTTP-only
 * ✓ Protected routes redirect unauthenticated users to login
 * ✓ Remember Me feature stores only username (no sensitive data)
 * ✓ Logout clears session server-side
 * 
 * ## Environment Variables Required
 * 
 * Create a .env file with:
 * ```
 * VITE_SUPABASE_URL=https://your-project.supabase.co
 * VITE_SUPABASE_ANON_KEY=your-anon-key
 * SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  (only for server-side operations)
 * ```
 * 
 * ## Troubleshooting
 * 
 * ### "Invalid username or password" error
 * - Verify the username exists in the profiles table
 * - Verify the user exists in auth.users with email "{username}@poultrymart.local"
 * - Check that the password is correct (case-sensitive)
 * 
 * ### Logout not working
 * - Clear browser cache and cookies if needed
 * - Check that Supabase session is properly cleared
 * 
 * ### Remember Me not persisting
 * - Ensure localStorage is enabled in browser
 * - Check that Private Browsing mode is not active
 * 
 * ## Next Steps
 * 
 * 1. Set up environment variables in .env
 * 2. Run the seed script to create initial owner account
 * 3. Test login/logout flow
 * 4. (Optional) Create additional users via admin interface
 * 5. Monitor auth.users and profiles tables in Supabase console
 */

export {};
