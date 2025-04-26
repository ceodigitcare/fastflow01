import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { sendChatMessage } from "@/lib/chatbot";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot } from "lucide-react";
import { generateId } from "@/lib/utils";

interface ChatInterfaceProps {
  conversationId?: number;
  className?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  productRecommendations?: any[];
}

export default function ChatInterface({ conversationId, className = "" }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get the conversation if ID is provided
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });
  
  // Get business data
  const { data: business } = useQuery({
    queryKey: ["/api/business"],
  });
  
  // Load conversation messages if conversationId is provided
  useEffect(() => {
    if (conversation && conversation.messages) {
      const formattedMessages = conversation.messages.map((msg: any) => ({
        id: generateId(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        productRecommendations: msg.productRecommendations,
      }));
      
      setMessages(formattedMessages);
    } else if (!conversationId && messages.length === 0) {
      // Add a welcome message if no conversation and no messages
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: "Hello! This is a preview of how your chatbot will appear to customers. Feel free to try it out.",
          timestamp: new Date(),
        }
      ]);
    }
  }, [conversation, conversationId]);
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !business?.id) return;
    
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
      const response = await sendChatMessage(
        business.id,
        newMessage,
        conversationId
      );
      
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
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
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
  
  return (
    <Card className={`flex flex-col h-[500px] ${className}`}>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 mr-2 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
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
                            Add to Cart
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                          >
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
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <CardFooter className="p-4 border-t">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || conversationLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isLoading || conversationLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}