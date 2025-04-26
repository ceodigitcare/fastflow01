import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatbotSettings {
  name: string;
  welcomeMessage: string;
  enableRecommendations: boolean;
  allowOrderCreation: boolean;
  enableOrderTracking: boolean;
  widgetPosition: "bottomRight" | "bottomLeft";
}

export default function ChatbotSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<ChatbotSettings>({
    name: "ShopAssist",
    welcomeMessage: "👋 Hi there! I'm ShopAssist, your AI shopping assistant. How can I help you today?",
    enableRecommendations: true,
    allowOrderCreation: true,
    enableOrderTracking: true,
    widgetPosition: "bottomRight",
  });
  
  // Get business data to check for existing chatbot settings
  const { data: business } = useQuery({
    queryKey: ["/api/business"],
  });
  
  useEffect(() => {
    if (business?.chatbotSettings) {
      setSettings(business.chatbotSettings);
    }
  }, [business]);
  
  // Update chatbot settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: ChatbotSettings) => {
      return await apiRequest("PATCH", "/api/chatbot/settings", newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your chatbot settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chatbot settings. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };
  
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Chatbot Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="chatbot-name">Chatbot Name</Label>
          <Input
            id="chatbot-name"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
        </div>
        
        <div>
          <Label htmlFor="welcome-message">Welcome Message</Label>
          <Textarea
            id="welcome-message"
            value={settings.welcomeMessage}
            onChange={(e) =>
              setSettings({ ...settings, welcomeMessage: e.target.value })
            }
            className="h-20"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="product-recommendations"
            checked={settings.enableRecommendations}
            onCheckedChange={(checked) =>
              setSettings({
                ...settings,
                enableRecommendations: checked as boolean,
              })
            }
          />
          <Label
            htmlFor="product-recommendations"
            className="text-sm font-normal"
          >
            Enable product recommendations
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="order-creation"
            checked={settings.allowOrderCreation}
            onCheckedChange={(checked) =>
              setSettings({
                ...settings,
                allowOrderCreation: checked as boolean,
              })
            }
          />
          <Label
            htmlFor="order-creation"
            className="text-sm font-normal"
          >
            Allow order creation via chat
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="order-tracking"
            checked={settings.enableOrderTracking}
            onCheckedChange={(checked) =>
              setSettings({
                ...settings,
                enableOrderTracking: checked as boolean,
              })
            }
          />
          <Label
            htmlFor="order-tracking"
            className="text-sm font-normal"
          >
            Enable order tracking
          </Label>
        </div>
        
        <div className="pt-2">
          <h4 className="text-sm font-medium mb-2">Chat Widget Position</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={settings.widgetPosition === "bottomRight" ? "secondary" : "outline"}
              onClick={() =>
                setSettings({
                  ...settings,
                  widgetPosition: "bottomRight",
                })
              }
            >
              Bottom Right
            </Button>
            <Button
              type="button"
              variant={settings.widgetPosition === "bottomLeft" ? "secondary" : "outline"}
              onClick={() =>
                setSettings({
                  ...settings,
                  widgetPosition: "bottomLeft",
                })
              }
            >
              Bottom Left
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
