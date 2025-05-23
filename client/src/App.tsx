import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import Dashboard from "@/pages/Dashboard";
import WebsiteBuilder from "@/pages/WebsiteBuilder";
import AIChat from "@/pages/AIChat";
import Products from "@/pages/Products";
import Finances from "@/pages/Finances";
import PurchaseBill from "@/pages/PurchaseBill";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/auth-page";
import ChatWidget from "@/pages/ChatWidget";
import NotFound from "@/pages/not-found";
import Analytics from "@/pages/Analytics";
import Help from "@/pages/Help";
import Documentation from "@/pages/Documentation";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/chat/:businessId" component={ChatWidget} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/website-builder" component={WebsiteBuilder} />
      <ProtectedRoute path="/ai-chatbot" component={AIChat} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/finances" component={Finances} />
      {/* Add all Finances submenu paths */}
      <ProtectedRoute path="/finances/transactions" component={Finances} />
      <ProtectedRoute path="/finances/sales-invoice" component={Finances} />
      <ProtectedRoute path="/finances/purchase-bill" component={PurchaseBill} />
      <ProtectedRoute path="/finances/user" component={Finances} />
      <ProtectedRoute path="/finances/accounts" component={Finances} />
      <ProtectedRoute path="/finances/chart-of-accounts" component={Finances} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/help" component={Help} />
      <ProtectedRoute path="/documentation" component={Documentation} />
      <ProtectedRoute path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
