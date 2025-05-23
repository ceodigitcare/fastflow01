import { useState, useEffect } from "react";
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
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  ReceiptText,
  Users,
  Wallet,
  BarChart4
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

// Define submenu interface
interface SubmenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  submenu?: SubmenuItem[];
}

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [upgradeHovered, setUpgradeHovered] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Function to check if the current location is within a specific section
  const isInSection = (path: string) => {
    return location.startsWith(path);
  };
  
  // Auto-expand the finances menu if we're in the finances section
  useEffect(() => {
    if (isInSection('/finances') && !expandedMenus.includes('/finances')) {
      setExpandedMenus(prev => [...prev, '/finances']);
    }
  }, [location]);
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  const toggleSubmenu = (path: string) => {
    if (expandedMenus.includes(path)) {
      setExpandedMenus(expandedMenus.filter(item => item !== path));
    } else {
      setExpandedMenus([...expandedMenus, path]);
    }
  };
  
  // Define the finances submenu items in the exact order specified
  const financesSubmenu: SubmenuItem[] = [
    { path: "/finances/transactions", label: "Transactions", icon: <FileText className="w-4 h-4" /> },
    { path: "/finances/sales-invoice", label: "Sales Invoice", icon: <ReceiptText className="w-4 h-4" /> },
    { path: "/finances/purchase-bill", label: "Purchase Bill", icon: <ReceiptText className="w-4 h-4" /> },
    { path: "/finances/user", label: "User", icon: <Users className="w-4 h-4" /> },
    { path: "/finances/accounts", label: "Accounts", icon: <Wallet className="w-4 h-4" /> },
    { path: "/finances/chart-of-accounts", label: "Chart of Accounts", icon: <BarChart4 className="w-4 h-4" /> }
  ];
  
  const navItems: MenuItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/website-builder", label: "Website Builder", icon: <Store className="w-5 h-5" /> },
    { path: "/ai-chatbot", label: "AI Chatbot", icon: <Bot className="w-5 h-5" /> },
    { path: "/products", label: "Products", icon: <ShoppingCart className="w-5 h-5" /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart2 className="w-5 h-5" /> },
    { 
      path: "/finances", 
      label: "Finances", 
      icon: <DollarSign className="w-5 h-5" />,
      submenu: financesSubmenu
    },
    { path: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];
  
  const supportItems = [
    { path: "/help", label: "Help Center", icon: <HelpCircle className="w-5 h-5" /> },
    { path: "/documentation", label: "Documentation", icon: <BookOpen className="w-5 h-5" /> },
  ];
  
  // Updated sidebar styling with smooth transitions for both mobile and desktop
  const sidebarClasses = `bg-white w-64 min-h-screen shadow-md transform transition-transform duration-300 ease-in-out z-20 ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  } fixed`;
  
  return (
    <aside className={sidebarClasses} data-expanded={isOpen}>
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center flex-1">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="ml-3 font-semibold text-lg">StoreFront</span>
        </Link>
        {/* Cross icon always visible when sidebar is open regardless of screen size */}
        <button 
          onClick={() => {
            onClose();
            // Store preference on desktop view
            if (window.innerWidth >= 1024) {
              localStorage.setItem('desktopSidebarOpen', 'false');
            }
          }} 
          className="text-foreground hover:text-gray-600 transition-colors"
          aria-label="Hide sidebar"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="px-4 py-2">
        <p className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4 pl-3">MENU</p>
        <nav>
          {navItems.map(item => (
            <div key={item.path}>
              {item.submenu ? (
                // Menu item with submenu
                <div className="mb-1">
                  <button
                    onClick={() => toggleSubmenu(item.path)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-md text-left ${
                      isInSection(item.path)
                        ? "text-primary bg-primary/10" 
                        : "text-foreground hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </div>
                    {expandedMenus.includes(item.path) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                  
                  {/* Submenu items */}
                  {expandedMenus.includes(item.path) && (
                    <div className="pl-8 mt-1 mb-2 space-y-1">
                      {item.submenu.map(subItem => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          className={`flex items-center px-3 py-2 rounded-md text-sm ${
                            location === subItem.path
                              ? "text-primary bg-primary/10" 
                              : "text-foreground hover:bg-gray-100"
                          }`}
                          onClick={() => { 
                            // On mobile devices, close the sidebar when a submenu item is clicked
                            if (window.innerWidth < 1024) {
                              onClose();
                            }
                          }}
                        >
                          {subItem.icon}
                          <span className="ml-2">{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular menu item without submenu
                <Link 
                  href={item.path}
                  className={`flex items-center px-3 py-2.5 mb-1 rounded-md ${
                    location === item.path 
                      ? "text-primary bg-primary/10" 
                      : "text-foreground hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    // On mobile devices, close the sidebar when an item is clicked
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              )}
            </div>
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
              onClick={() => {
                // On mobile devices, close the sidebar when an item is clicked
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
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
