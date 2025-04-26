import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBgClass: string;
  percentageChange: number;
  comparisonText: string;
}

export default function MetricCard({
  label,
  value,
  icon,
  iconBgClass,
  percentageChange,
  comparisonText
}: MetricCardProps) {
  const isPositive = percentageChange >= 0;
  
  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-center">
          <span className={`text-sm flex items-center ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? (
              <ArrowUp className="mr-1 h-4 w-4" />
            ) : (
              <ArrowDown className="mr-1 h-4 w-4" />
            )}
            {Math.abs(percentageChange)}%
          </span>
          <span className="text-xs text-gray-500 ml-2">{comparisonText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
