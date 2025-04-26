import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

// Sample data - in a real app this would come from the API
const chartData = {
  day: [
    { name: "Mon", revenue: 1200, visitors: 300 },
    { name: "Tue", revenue: 1800, visitors: 450 },
    { name: "Wed", revenue: 1400, visitors: 350 },
    { name: "Thu", revenue: 2000, visitors: 500 },
    { name: "Fri", revenue: 1600, visitors: 400 },
    { name: "Sat", revenue: 2400, visitors: 600 },
    { name: "Sun", revenue: 1800, visitors: 450 },
  ],
  week: [
    { name: "Week 1", revenue: 8400, visitors: 2100 },
    { name: "Week 2", revenue: 9600, visitors: 2400 },
    { name: "Week 3", revenue: 12000, visitors: 3000 },
    { name: "Week 4", revenue: 10800, visitors: 2700 },
  ],
  month: [
    { name: "Jan", revenue: 42000, visitors: 10500 },
    { name: "Feb", revenue: 38000, visitors: 9500 },
    { name: "Mar", revenue: 48000, visitors: 12000 },
    { name: "Apr", revenue: 52000, visitors: 13000 },
    { name: "May", revenue: 58000, visitors: 14500 },
    { name: "Jun", revenue: 62000, visitors: 15500 },
  ],
};

type Period = "day" | "week" | "month";

export default function RevenueChart() {
  const [period, setPeriod] = useState<Period>("week");
  
  return (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Revenue Overview</CardTitle>
          <div className="flex">
            <Button
              variant={period === "day" ? "default" : "outline"}
              size="sm"
              className="rounded-l-md rounded-r-none"
              onClick={() => setPeriod("day")}
            >
              Day
            </Button>
            <Button
              variant={period === "week" ? "default" : "outline"}
              size="sm"
              className="rounded-none"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "default" : "outline"}
              size="sm"
              className="rounded-r-md rounded-l-none"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData[period]}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value}`, ""]}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                barSize={40} 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="visitors" 
                fill="hsl(var(--primary) / 0.2)" 
                barSize={40} 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center mt-4">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-primary rounded-sm mr-2"></div>
            <span className="text-xs text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary/20 rounded-sm mr-2"></div>
            <span className="text-xs text-gray-600">Visitors</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
