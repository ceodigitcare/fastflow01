import express from "express";
import { storage } from "./storage";
import { z } from "zod";

export const chatbotRouter = express.Router();

// Mock Gemini AI response generation
// In a real implementation, this would use the Google AI Node.js client
const generateAIResponse = async (
  message: string,
  businessId: number,
  conversationContext: any[] = []
) => {
  // Get business to personalize responses
  const business = await storage.getBusiness(businessId);
  const products = await storage.getProductsByBusiness(businessId);
  
  // Simulate AI response generation
  const lowercaseMessage = message.toLowerCase();
  
  if (lowercaseMessage.includes("hello") || lowercaseMessage.includes("hi")) {
    return {
      text: `👋 Hi there! Welcome to ${business?.name || "our store"}. How can I help you today?`,
      productRecommendations: []
    };
  }
  
  if (lowercaseMessage.includes("product") || lowercaseMessage.includes("buy") || lowercaseMessage.includes("purchase")) {
    // Return product recommendations based on query
    const recommendedProducts = products.slice(0, 2);
    return {
      text: `Here are some products that might interest you:`,
      productRecommendations: recommendedProducts
    };
  }
  
  if (lowercaseMessage.includes("order") && lowercaseMessage.includes("status")) {
    return {
      text: `You can check your order status in your account. Would you like me to help you navigate there?`,
      productRecommendations: []
    };
  }
  
  if (lowercaseMessage.includes("shipping") || lowercaseMessage.includes("delivery")) {
    return {
      text: `We offer standard shipping (3-5 business days) and express shipping (1-2 business days). Free shipping on orders over $50!`,
      productRecommendations: []
    };
  }
  
  if (lowercaseMessage.includes("return") || lowercaseMessage.includes("refund")) {
    return {
      text: `Our return policy allows returns within 30 days of purchase. Would you like more details about our return process?`,
      productRecommendations: []
    };
  }
  
  // Default response
  return {
    text: `Thank you for your message. How else can I assist you today?`,
    productRecommendations: []
  };
};

// Schema for chat messages
const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  conversationId: z.number().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

type ChatMessage = z.infer<typeof chatMessageSchema>;

// Public endpoint for business-specific chatbot
chatbotRouter.post("/:businessId/chat", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    if (isNaN(businessId)) {
      return res.status(400).json({ message: "Invalid business ID" });
    }
    
    const business = await storage.getBusiness(businessId);
    
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    const { message, conversationId, customerName, customerEmail } = chatMessageSchema.parse(req.body);
    
    let conversation;
    
    if (conversationId) {
      // Get existing conversation
      conversation = await storage.getConversation(conversationId);
      
      if (!conversation || conversation.businessId !== businessId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    } else {
      // Create new conversation
      conversation = await storage.createConversation({
        businessId,
        customerName: customerName || "Guest",
        customerEmail: customerEmail || undefined,
        messages: [],
      });
    }
    
    // Add user message to conversation
    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    
    const updatedMessages = [...(conversation.messages as any[]), userMessage];
    
    // Generate AI response
    const aiResponse = await generateAIResponse(
      message, 
      businessId, 
      conversation.messages as any[]
    );
    
    // Add AI response to conversation
    const botMessage = {
      role: "assistant",
      content: aiResponse.text,
      timestamp: new Date(),
      productRecommendations: aiResponse.productRecommendations,
    };
    
    const finalMessages = [...updatedMessages, botMessage];
    
    // Update conversation with new messages
    await storage.updateConversation(conversation.id, {
      messages: finalMessages,
    });
    
    res.json({
      conversationId: conversation.id,
      message: botMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid data", errors: error.errors });
    } else {
      console.error(error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  }
});

// Get conversation history (authenticated)
chatbotRouter.get("/conversations/:id", async (req, res) => {
  try {
    if (!req.session.businessId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const businessId = req.session.businessId as number;
    const conversationId = parseInt(req.params.id);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    const conversation = await storage.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (conversation.businessId !== businessId) {
      return res.status(403).json({ message: "Unauthorized access to this conversation" });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to get conversation" });
  }
});

// Update chatbot settings
chatbotRouter.patch("/settings", async (req, res) => {
  try {
    if (!req.session.businessId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const businessId = req.session.businessId as number;
    const business = await storage.getBusiness(businessId);
    
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    const updatedBusiness = await storage.updateBusiness(businessId, {
      chatbotSettings: req.body,
    });
    
    res.json({ message: "Chatbot settings updated", settings: updatedBusiness?.chatbotSettings });
  } catch (error) {
    res.status(500).json({ message: "Failed to update chatbot settings" });
  }
});

// Widget embed code
chatbotRouter.get("/widget/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    if (isNaN(businessId)) {
      return res.status(400).json({ message: "Invalid business ID" });
    }
    
    const business = await storage.getBusiness(businessId);
    
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    // Generate widget embed code
    const embedCode = `
      <script>
        (function() {
          const script = document.createElement('script');
          script.src = '${req.protocol}://${req.get('host')}/api/chatbot/widget.js';
          script.async = true;
          script.dataset.businessId = '${businessId}';
          document.head.appendChild(script);
        })();
      </script>
    `;
    
    res.json({ embedCode });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate widget code" });
  }
});
