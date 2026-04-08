/**
 * Helper functions for user authentication and management
 * Used by admin scripts and API routes
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Create a new user account with Supabase Admin API
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 * 
 * @param username - Unique username for the user
 * @param password - User's password (should be securely generated)
 * @param fullName - User's full name
 * @param role - 'owner' or 'cashier'
 * @param phone - Optional phone number
 * @returns User ID if successful, null if failed
 */
export async function createUserWithAdmin(
  username: string,
  password: string,
  fullName: string,
  role: "owner" | "cashier",
  phone?: string
): Promise<string | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Create auth user with email format: {username}@poultrymart.local
    const email = `${username}@poultrymart.local`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // Store username in user metadata for reference
        },
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      return null;
    }

    const userId = authData.user.id;

    // Create profile linked to auth user
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        username,
        full_name: fullName,
        role,
        phone: phone || null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Attempt to clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return null;
    }

    console.log(`✓ User created successfully: ${username} (${userId})`);
    return userId;
  } catch (error) {
    console.error("Error in createUserWithAdmin:", error);
    return null;
  }
}

/**
 * Update user password
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */
export async function updateUserPasswordWithAdmin(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error updating user password:", error);
      return false;
    }

    console.log(`✓ Password updated for user: ${userId}`);
    return true;
  } catch (error) {
    console.error("Error in updateUserPasswordWithAdmin:", error);
    return false;
  }
}

/**
 * Delete user and associated profile
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */
export async function deleteUserWithAdmin(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Delete auth user (profile will be deleted via CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Error deleting user:", error);
      return false;
    }

    console.log(`✓ User deleted: ${userId}`);
    return true;
  } catch (error) {
    console.error("Error in deleteUserWithAdmin:", error);
    return false;
  }
}
