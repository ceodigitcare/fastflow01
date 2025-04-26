import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle, ShoppingCart } from "lucide-react";

export default function AIInsights() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Chatbot Insights</CardTitle>
          <Button variant="ghost" size="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-horizontal h-4 w-4"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-primary mr-4">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Customer Inquiries</p>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">168</span>
              <span className="text-success text-xs ml-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up mr-1 h-3 w-3"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                12%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-success mr-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Resolved Automatically</p>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">86%</span>
              <span className="text-success text-xs ml-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up mr-1 h-3 w-3"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                5%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Orders via Chat</p>
            <div className="flex items-center">
              <span className="text-2xl font-semibold">42</span>
              <span className="text-success text-xs ml-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up mr-1 h-3 w-3"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                18%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          View Detailed Report
        </Button>
      </CardFooter>
    </Card>
  );
}
