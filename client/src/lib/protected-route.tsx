import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Use the centralized auth hook for consistent state management
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    // Don't redirect if we're already on the auth page to prevent loops
    const currentPath = window.location.pathname;
    if (currentPath !== '/auth') {
      return (
        <Route path={path}>
          <Redirect to="/auth" />
        </Route>
      );
    }
    // Return null rather than rendering the component when not authenticated
    return null;
  }

  // User is authenticated, render the protected component
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}