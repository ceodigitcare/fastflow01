import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Store, 
  Bot, 
  ShoppingCart, 
  BarChart2, 
  DollarSign, 
  Settings,
  HelpCircle,
  BookOpen,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [upgradeHovered, setUpgradeHovered] = useState(false);
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/website-builder", label: "Website Builder", icon: <Store className="w-5 h-5" /> },
    { path: "/ai-chatbot", label: "AI Chatbot", icon: <Bot className="w-5 h-5" /> },
    { path: "/products", label: "Products", icon: <ShoppingCart className="w-5 h-5" /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart2 className="w-5 h-5" /> },
    { path: "/finances", label: "Finances", icon: <DollarSign className="w-5 h-5" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];
  
  const supportItems = [
    { path: "/help", label: "Help Center", icon: <HelpCircle className="w-5 h-5" /> },
    { path: "/documentation", label: "Documentation", icon: <BookOpen className="w-5 h-5" /> },
  ];
  
  const sidebarClasses = `bg-white w-64 min-h-screen shadow-md transform transition-transform duration-300 ease-in-out z-20 lg:translate-x-0 ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  } fixed lg:relative`;
  
  return (
    <aside className={sidebarClasses} data-expanded={isOpen}>
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="ml-3 font-semibold text-lg">StoreFront</span>
        </Link>
        <button onClick={onClose} className="lg:hidden text-foreground">
          <X size={18} />
        </button>
      </div>
      
      <div className="px-4 py-2">
        <p className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4 pl-3">MENU</p>
        <nav>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center px-3 py-2.5 mb-1 rounded-md ${
                location === item.path 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-gray-100"
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-6 px-4 py-2">
        <p className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4 pl-3">SUPPORT</p>
        <nav>
          {supportItems.map(item => (
            <Link 
              key={item.path} 
              href={item.path}
              className="flex items-center px-3 py-2.5 mb-1 text-foreground hover:bg-gray-100 rounded-md"
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-primary mb-2">Upgrade to Pro</p>
          <p className="text-xs text-gray-600 mb-3">Get advanced features for your growing business</p>
          <Button 
            className={`w-full ${upgradeHovered ? "bg-primary-dark" : "bg-primary"}`}
            onMouseEnter={() => setUpgradeHovered(true)}
            onMouseLeave={() => setUpgradeHovered(false)}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </aside>
  );
}
