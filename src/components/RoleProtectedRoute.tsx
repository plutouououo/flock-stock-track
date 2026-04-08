import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * RoleProtectedRoute component
 * Wraps routes that require specific roles
 * Redirects to dashboard if user doesn't have required role
 */
interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "cashier";
}

export function RoleProtectedRoute({ children, requiredRole = "owner" }: RoleProtectedRouteProps) {
  const { userId, role, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
