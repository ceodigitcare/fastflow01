import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chatbot/ChatInterface";
import ChatbotEmbed from "@/components/chatbot/ChatbotEmbed";
import { Conversation } from "@shared/schema";
import { getChatbotEmbedCode } from "@/lib/chatbot";
import { formatDate } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bot, MessageSquare, Users, ArrowUpRight } from "lucide-react";

export default function AIChat() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);
  
  // Fetch the business ID for the current user
  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["/api/business"],
  });
  
  // Fetch chatbot settings
  const { data: chatbotSettings } = useQuery({
    queryKey: ["/api/chatbot/settings"],
    enabled: !!business?.id,
  });
  
  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!business?.id,
  });
  
  // Generate embed code
  const handleGetEmbed = async () => {
    try {
      if (!business?.id) return;
      
      const response = await getChatbotEmbedCode(business.id);
      setShowEmbed(true);
      toast({
        title: "Embed Code Generated",
        description: "You can now add the chatbot to your website.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate embed code. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AI Chatbot</h1>
        <p className="text-sm text-gray-500">Manage your Gemini AI-powered chatbot for customer support</p>
      </div>
      
      <Tabs defaultValue="dashboard" className="mb-8">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Conversations</p>
                    <p className="text-2xl font-semibold mt-1">{conversations?.length || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                    <MessageSquare size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Users</p>
                    <p className="text-2xl font-semibold mt-1">124</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-success">
                    <Users size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chat Completion Rate</p>
                    <p className="text-2xl font-semibold mt-1">86%</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary bg-opacity-10 flex items-center justify-center text-secondary">
                    <Bot size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chat Conversions</p>
                    <p className="text-2xl font-semibold mt-1">42</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChatInterface className="lg:col-span-2" />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Conversations</CardTitle>
                <CardDescription>Latest customer inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center mb-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : conversations?.length ? (
                  <div className="space-y-4">
                    {conversations.slice(0, 5).map((conversation) => {
                      const lastMessage = conversation.messages[conversation.messages.length - 1];
                      return (
                        <div key={conversation.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between mb-1">
                            <p className="font-medium text-sm">
                              {conversation.customerName || "Anonymous User"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(conversation.updatedAt)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {lastMessage?.content || "No messages"}
                          </p>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-xs text-primary mt-1"
                            onClick={() => setSelectedConversation(conversation.id)}
                          >
                            View Conversation
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No conversations yet
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <a href="#conversations">View All Conversations</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="conversations" className="mt-6">
          {selectedConversation ? (
            <>
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setSelectedConversation(null)}
              >
                Back to Conversations
              </Button>
              <ChatInterface conversationId={selectedConversation} />
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">All Conversations</h2>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conversations</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversationsLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded w-32"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded w-8"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                            <TableCell><div className="h-8 bg-gray-200 rounded w-20 ml-auto"></div></TableCell>
                          </TableRow>
                        ))
                      ) : conversations?.length ? (
                        conversations.map((conversation) => (
                          <TableRow key={conversation.id}>
                            <TableCell>{conversation.customerName || "Anonymous"}</TableCell>
                            <TableCell>{conversation.customerEmail || "N/A"}</TableCell>
                            <TableCell>{formatDate(conversation.updatedAt)}</TableCell>
                            <TableCell>{conversation.messages.length}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-success">
                                Active
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedConversation(conversation.id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No conversations found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Chatbot Settings</CardTitle>
              <CardDescription>Configure your AI chatbot's behavior and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chatbot-name">Chatbot Name</Label>
                <Input
                  id="chatbot-name"
                  defaultValue={chatbotSettings?.name || "ShopAssist"}
                  placeholder="Enter your chatbot's name"
                />
              </div>
              
              <div>
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea
                  id="welcome-message"
                  defaultValue={chatbotSettings?.welcomeMessage || "👋 Hi there! I'm your AI shopping assistant. How can I help you today?"}
                  placeholder="Enter the welcome message"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enable-recommendations" 
                    defaultChecked={chatbotSettings?.enableRecommendations !== false}
                  />
                  <Label htmlFor="enable-recommendations" className="font-normal">
                    Enable product recommendations
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="allow-orders" 
                    defaultChecked={chatbotSettings?.allowOrderCreation !== false}
                  />
                  <Label htmlFor="allow-orders" className="font-normal">
                    Allow order creation via chat
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enable-tracking" 
                    defaultChecked={chatbotSettings?.enableOrderTracking !== false}
                  />
                  <Label htmlFor="enable-tracking" className="font-normal">
                    Enable order tracking
                  </Label>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Chat Widget Position</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    type="button" 
                    variant={chatbotSettings?.widgetPosition === "bottomRight" ? "default" : "outline"}
                  >
                    Bottom Right
                  </Button>
                  <Button 
                    type="button" 
                    variant={chatbotSettings?.widgetPosition === "bottomLeft" ? "default" : "outline"}
                  >
                    Bottom Left
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Chat Theme Colors</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color" className="text-xs">Header Color</Label>
                    <div className="flex items-center mt-1 space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary"></div>
                      <Input id="primary-color" defaultValue="#0052CC" className="h-8" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bubble-color" className="text-xs">Message Bubble Color</Label>
                    <div className="flex items-center mt-1 space-x-2">
                      <div className="w-6 h-6 rounded-full bg-secondary"></div>
                      <Input id="bubble-color" defaultValue="#00B8D9" className="h-8" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset to Default</Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="embed" className="mt-6">
          {showEmbed ? (
            <ChatbotEmbed businessId={business?.id} />
          ) : (
            <Card className="text-center p-8">
              <CardHeader>
                <CardTitle>Add Chatbot to Your Website</CardTitle>
                <CardDescription>
                  Generate an embed code to add the AI chatbot to your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-gray-600 mb-4">
                    With a single line of code, you can add your customized AI chatbot to your website. It will help your customers with inquiries, product recommendations, and order processing.
                  </p>
                  <div className="flex justify-center">
                    <img 
                      src="https://cdn-icons-png.flaticon.com/512/2068/2068998.png" 
                      alt="Chatbot Illustration" 
                      className="w-32 h-32 opacity-60"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={handleGetEmbed}>
                  Generate Embed Code
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
