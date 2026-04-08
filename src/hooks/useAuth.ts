import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  role: "owner" | "cashier" | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    userId: null,
    profile: null,
    role: null,
    loading: true,
    logout: async () => {},
  });

  // Handle logout
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setState({
        userId: null,
        profile: null,
        role: null,
        loading: false,
        logout,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (mounted) {
        setState({
          userId,
          profile: data ?? null,
          role: data?.role ?? null,
          loading: false,
          logout,
        });
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        load(session.user.id);
      } else {
        if (mounted) setState({ userId: null, profile: null, role: null, loading: false, logout });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        load(session.user.id);
      } else {
        if (mounted) setState({ userId: null, profile: null, role: null, loading: false, logout });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [logout]);

  return state;
}