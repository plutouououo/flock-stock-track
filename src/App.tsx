import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import RecordSale from "./pages/RecordSale";
import Reports from "./pages/Reports";
import ShoppingList from "./pages/ShoppingList";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Root app component with authentication routing
 * - /login: Public login page
 * - All other routes: Protected by ProtectedRoute (require authentication)
 */
const App = () => {
  const { userId, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={userId ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Owner-only routes */}
              <Route
                path="/"
                element={<RoleProtectedRoute requiredRole="owner"><Dashboard /></RoleProtectedRoute>}
              />
              <Route
                path="/reports"
                element={<RoleProtectedRoute requiredRole="owner"><Reports /></RoleProtectedRoute>}
              />
              <Route
                path="/shopping-list"
                element={<RoleProtectedRoute requiredRole="owner"><ShoppingList /></RoleProtectedRoute>}
              />
              <Route
                path="/customers"
                element={<RoleProtectedRoute requiredRole="owner"><Customers /></RoleProtectedRoute>}
              />
              <Route
                path="/expenses"
                element={<RoleProtectedRoute requiredRole="owner"><Expenses /></RoleProtectedRoute>}
              />
              
              {/* Cashier-accessible routes */}
              <Route path="/products" element={<Products />} />
              <Route path="/sales" element={<RecordSale />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
