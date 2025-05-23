import { useState } from "react";
import { 
  Bell, 
  User,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  onSidebarToggle: () => void;
  user: any;
  isSidebarOpen?: boolean;
  onRightPanelToggle?: () => void;
}

export default function Header({ onSidebarToggle, user, isSidebarOpen, onRightPanelToggle }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    // Use the logout function from the auth context
    logout();
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - only show hamburger when sidebar is hidden */}
        {!isSidebarOpen && (
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onSidebarToggle} aria-label="Show menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {/* Center spacer when sidebar is open */}
        {isSidebarOpen && <div></div>}
        
        <div className="flex items-center ml-auto space-x-2">
          <div className="relative mr-4">
            <Button variant="ghost" size="icon" className="relative">
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              <Bell className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Right panel toggle - only show on Purchase Bill page when onRightPanelToggle is provided */}
          {onRightPanelToggle && (
            <Button variant="ghost" size="icon" onClick={onRightPanelToggle} aria-label="Toggle bill list">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 focus:outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">{user?.name || "User"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setLocation("/profile")}>
                Your Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
