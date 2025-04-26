import { useState } from "react";
import { 
  Bell, 
  User,
  ChevronDown,
  Menu
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
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface HeaderProps {
  onSidebarToggle: () => void;
  user: any;
}

export default function Header({ onSidebarToggle, user }: HeaderProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center lg:hidden">
          <Button variant="ghost" size="icon" onClick={onSidebarToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center ml-auto">
          <div className="relative mr-4">
            <Button variant="ghost" size="icon" className="relative">
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              <Bell className="h-5 w-5" />
            </Button>
          </div>
          
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
