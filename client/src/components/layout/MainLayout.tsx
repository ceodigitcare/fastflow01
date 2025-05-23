import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  onRightPanelToggle?: () => void;
}

export default function MainLayout({ children, onRightPanelToggle }: MainLayoutProps) {
  // Default sidebar state - closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  // Get authentication state from our useAuth hook
  const { user, isLoading, error } = useAuth();
  
  // Initialize sidebarOpen based on screen size and store user preference
  useEffect(() => {
    // Check if we have a stored preference for desktop sidebar
    const storedPreference = localStorage.getItem('desktopSidebarOpen');
    
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        // Only use default (true) if no preference is stored
        if (storedPreference === null) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(storedPreference === 'true');
        }
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state based on current window size
    handleResize();
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      // Only redirect if we're not already on the auth page
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        setLocation("/auth");
      }
    }
  }, [user, isLoading, setLocation]);
  
  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [useLocation()[0]]);
  
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    
    // Only store preference when on desktop
    if (window.innerWidth >= 1024) {
      localStorage.setItem('desktopSidebarOpen', String(newState));
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="font-sans bg-background text-foreground min-h-screen flex">
      {/* Backdrop overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      
      {/* Sidebar with improved positioning */}
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} user={user} />
      
      {/* Main content that expands when sidebar is hidden */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <Header 
          onSidebarToggle={toggleSidebar} 
          user={user}
          isSidebarOpen={sidebarOpen}
          onRightPanelToggle={onRightPanelToggle}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
