import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/Dashboard";
import WebsiteBuilder from "@/pages/WebsiteBuilder";
import AIChat from "@/pages/AIChat";
import Products from "@/pages/Products";
import Finances from "@/pages/Finances";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ChatWidget from "@/pages/ChatWidget";
import NotFound from "@/pages/not-found";
import Analytics from "@/pages/Analytics";
import Help from "@/pages/Help";
import Documentation from "@/pages/Documentation";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route path="/website-builder" component={WebsiteBuilder} />
      <Route path="/ai-chatbot" component={AIChat} />
      <Route path="/products" component={Products} />
      <Route path="/finances" component={Finances} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route path="/documentation" component={Documentation} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat/:businessId" component={ChatWidget} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
