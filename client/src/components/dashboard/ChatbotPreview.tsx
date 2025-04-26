import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, ShoppingCart } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  product?: {
    id: number;
    name: string;
    price: string;
    image: string;
    color: string;
    size: string;
  };
}

export default function ChatbotPreview() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "user",
      content: "Hello, do you have these sneakers in size 10?",
    },
    {
      id: "2",
      role: "assistant",
      content: "Yes, we have the \"UltraBoost 5.0\" in size 10. Would you like to see them?",
    },
    {
      id: "3",
      role: "user",
      content: "Yes please!",
    },
    {
      id: "4",
      role: "assistant",
      content: "Here's our UltraBoost 5.0 in size 10:",
      product: {
        id: 1,
        name: "UltraBoost 5.0",
        price: "$180.00",
        image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        color: "Black",
        size: "10",
      },
    },
    {
      id: "5",
      role: "user",
      content: "Great! I'll add them to my cart. How long will shipping take?",
    },
    {
      id: "6",
      role: "assistant",
      content: "We offer free 2-day shipping on all orders over $100. Your order qualifies, so you'll receive it within 2 business days!",
    }
  ]);
  
  const [newMessage, setNewMessage] = useState("");
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add user message
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        role: "user",
        content: newMessage,
      }
    ]);
    
    // Clear input
    setNewMessage("");
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Thank you for your message. How else can I assist you today?",
        }
      ]);
    }, 1000);
  };
  
  return (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-medium">Conversation Preview</CardTitle>
        <p className="text-sm text-gray-500">See how your AI assistant interacts with customers</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-background rounded-md mx-6 p-4 h-80 overflow-y-auto flex flex-col space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex items-start ${
                message.role === "assistant" ? "justify-end" : ""
              }`}
            >
              {message.role === "user" && (
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-gray-300 text-white">U</AvatarFallback>
                </Avatar>
              )}
              
              <div 
                className={`rounded-lg p-3 max-w-xs sm:max-w-md ${
                  message.role === "assistant" 
                    ? "mr-2 bg-primary/10" 
                    : "bg-gray-100"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                
                {message.product && (
                  <div className="bg-white rounded-md p-3 mt-2">
                    <div className="flex">
                      <img 
                        src={message.product.image} 
                        alt={message.product.name} 
                        className="w-16 h-16 object-cover rounded" 
                      />
                      <div className="ml-3">
                        <p className="font-medium text-sm">{message.product.name}</p>
                        <p className="text-gray-500 text-xs">
                          Size: {message.product.size} | Color: {message.product.color}
                        </p>
                        <p className="text-primary font-medium text-sm mt-1">
                          {message.product.price}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex">
                      <Button size="sm" className="text-xs h-8 mr-2">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Add to Cart
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        More Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 ml-2">
                  <AvatarFallback className="bg-secondary text-white">AI</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-4">
        <div className="flex w-full">
          <Input
            placeholder="Type a test message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            className="rounded-r-none"
          />
          <Button 
            className="rounded-l-none"
            onClick={handleSendMessage}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
