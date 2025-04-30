import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useQuery } from "@tanstack/react-query";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();
  
  // Check if user is authenticated
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  
  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!isLoading && error) {
      // Only redirect if we got a 401 error and we're not already on the auth page
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        setLocation("/auth");
      }
    }
  }, [isLoading, error, setLocation]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="font-sans bg-background text-foreground min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} 
          user={user}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
