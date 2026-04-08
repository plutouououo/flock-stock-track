import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Login page component
 * Handles user authentication with username and password
 * Supports "Remember Me" functionality
 * 
 * Authentication flow:
 * 1. User enters username and password
 * 2. System verifies username exists in profiles table
 * 3. System authenticates with Supabase using email format: {username}@poultrymart.local
 * 4. On success, session is established and user is redirected to dashboard
 * 5. Failed auth shows appropriate error message
 */
export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get stored username if "Remember Me" was previously selected
  useEffect(() => {
    const storedUsername = localStorage.getItem("remembered_username");
    if (storedUsername) {
      setUsername(storedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!username.trim() || !password.trim()) {
        setError("Username and password are required");
        setLoading(false);
        return;
      }

      // Step 1: Verify that the username exists in the profiles table
      // This helps provide a better error message if username is wrong
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("username", username.trim())
        .single();

      if (profileError || !profileData) {
        console.error("Profile lookup error:", profileError);
        setError("Invalid username or password");
        setLoading(false);
        return;
      }

      // Step 2: Attempt authentication with Supabase Auth
      // Email format: {username}@poultrymart.local (consistent with seed script)
      const email = `${username}@poultrymart.local`;
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (authError) {
        console.error("Auth error:", authError.message);
        setError("Invalid username or password");
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("Failed to establish session. Please try again.");
        setLoading(false);
        return;
      }

      // Step 3: Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      // Step 4: Show success and redirect
      toast({
        title: "Login successful",
        description: `Welcome back, ${profileData.full_name}!`,
      });

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">PM</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Aneka Jaya 33</CardTitle>
          <CardDescription>Sales Management System</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="remember" className="cursor-pointer font-normal select-none">
                Remember me
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Info Text */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Use your assigned credentials to log in
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

