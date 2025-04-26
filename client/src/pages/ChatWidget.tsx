import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { sendChatMessage } from "@/lib/chatbot";
import { X, Send, ShoppingCart, ExternalLink, ChevronDown, Bot } from "lucide-react";
import { generateId } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  productRecommendations?: any[];
}

export default function ChatWidget() {
  const { businessId } = useParams<{ businessId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get business info
  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: [`/api/business/${businessId}`],
    enabled: !!businessId,
  });
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Add welcome message on load
  useEffect(() => {
    if (business && messages.length === 0) {
      const welcomeMessage = business.chatbotSettings?.welcomeMessage || 
        `👋 Hi there! Welcome to ${business.name}. How can I help you today?`;
      
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        }
      ]);
    }
  }, [business, messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !businessId) return;
    
    // Add user message immediately
    const userMessageId = generateId();
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: newMessage,
        timestamp: new Date()
      }
    ]);
    
    setNewMessage("");
    setIsLoading(true);
    
    try {
      // Convert businessId to number
      const businessIdNum = parseInt(businessId);
      if (isNaN(businessIdNum)) throw new Error("Invalid business ID");
      
      const response = await sendChatMessage(
        businessIdNum,
        newMessage,
        conversationId || undefined
      );
      
      // Set the conversation ID for future messages
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }
      
      // Add bot response
      setMessages(prev => [
        ...prev, 
        {
          id: generateId(),
          role: "assistant",
          content: response.message.content,
          timestamp: new Date(),
          productRecommendations: response.message.productRecommendations
        }
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again later.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 rounded-full shadow-lg p-4 h-14 w-14"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className={`w-full max-w-md mx-auto shadow-lg flex flex-col ${isMinimized ? 'h-auto' : 'h-[600px]'}`}>
        <CardHeader className="p-4 bg-primary text-white space-y-0 flex flex-row items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2 border-2 border-white">
              {business?.logoUrl ? (
                <AvatarImage src={business.logoUrl} />
              ) : null}
              <AvatarFallback className="bg-primary-foreground text-primary">
                {business?.name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h3 className="font-medium text-sm">
                {business?.name || "StoreFront AI"}
              </h3>
              <p className="text-xs text-primary-foreground/90">
                {isLoading ? "Typing..." : "Online"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-primary-foreground/20"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 mr-2 mt-1">
                      {business?.logoUrl ? (
                        <AvatarImage src={business.logoUrl} />
                      ) : null}
                      <AvatarFallback className="bg-secondary text-white">
                        {business?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="space-y-2 max-w-[75%]">
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {message.productRecommendations && message.productRecommendations.length > 0 && (
                      <div className="space-y-2">
                        {message.productRecommendations.map((product) => (
                          <div
                            key={product.id}
                            className="bg-card rounded-lg p-3 border shadow-sm"
                          >
                            <div className="flex">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-16 w-16 object-cover rounded mr-3"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{product.name}</h4>
                                <p className="text-primary font-medium text-sm mt-1">
                                  ${(product.price / 100).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex space-x-2">
                              <Button size="sm" className="h-8 text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Add to Cart
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 ml-2 mt-1">
                      <AvatarFallback className="bg-gray-300">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            
            <CardFooter className="p-4 border-t">
              <div className="flex w-full items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
