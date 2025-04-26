import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AIInsights from "@/components/dashboard/AIInsights";
import WebsiteTemplates from "@/components/dashboard/WebsiteTemplates";
import ChatbotPreview from "@/components/dashboard/ChatbotPreview";
import ChatbotSettings from "@/components/dashboard/ChatbotSettings";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import { DollarSign, Users, ShoppingBag, Bot } from "lucide-react";

export default function Dashboard() {
  // For a real app, these metrics would come from API calls
  const { data: business } = useQuery({
    queryKey: ["/api/business"],
  });
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back{business?.name ? `, ${business.name}` : ""}! Here's an overview of your business.
        </p>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          label="Total Sales"
          value="$12,426"
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          iconBgClass="bg-blue-100"
          percentageChange={12}
          comparisonText="vs last month"
        />
        
        <MetricCard
          label="Visitors"
          value="8,521"
          icon={<Users className="h-5 w-5 text-success" />}
          iconBgClass="bg-green-100"
          percentageChange={18}
          comparisonText="vs last month"
        />
        
        <MetricCard
          label="Orders"
          value="642"
          icon={<ShoppingBag className="h-5 w-5 text-secondary" />}
          iconBgClass="bg-secondary bg-opacity-10"
          percentageChange={5}
          comparisonText="vs last month"
        />
        
        <MetricCard
          label="AI Chat Interactions"
          value="2,841"
          icon={<Bot className="h-5 w-5 text-purple-600" />}
          iconBgClass="bg-purple-100"
          percentageChange={24}
          comparisonText="vs last month"
        />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <RevenueChart />
        <AIInsights />
      </div>
      
      {/* Website Templates Section */}
      <div className="mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Website Templates</h2>
          <a href="/website-builder" className="text-primary hover:text-blue-700 text-sm font-medium">
            View All Templates
          </a>
        </div>
        <WebsiteTemplates />
      </div>
      
      {/* AI Chatbot Section */}
      <div className="mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Gemini AI Chatbot</h2>
          <a href="/ai-chatbot" className="text-primary hover:text-blue-700 text-sm font-medium">
            Configure Chatbot
          </a>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChatbotPreview />
          <ChatbotSettings />
        </div>
      </div>
      
      {/* Financial Overview Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Financial Overview</h2>
          <a href="/finances" className="text-primary hover:text-blue-700 text-sm font-medium">
            View Full Reports
          </a>
        </div>
        
        <FinancialOverview />
      </div>
    </MainLayout>
  );
}
