import { apiRequest } from "./queryClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  productRecommendations?: any[];
}

export interface Conversation {
  id: number;
  businessId: number;
  customerName?: string;
  customerEmail?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatbotSettings {
  name: string;
  welcomeMessage: string;
  enableRecommendations: boolean;
  allowOrderCreation: boolean;
  enableOrderTracking: boolean;
  widgetPosition: "bottomRight" | "bottomLeft";
}

export async function getConversations() {
  return await apiRequest("GET", "/api/conversations", undefined);
}

export async function getConversation(id: number) {
  return await apiRequest("GET", `/api/chatbot/conversations/${id}`, undefined);
}

export async function sendChatMessage(businessId: number, message: string, conversationId?: number, customerInfo?: { name?: string, email?: string }) {
  return await apiRequest("POST", `/api/chatbot/${businessId}/chat`, {
    message,
    conversationId,
    customerName: customerInfo?.name,
    customerEmail: customerInfo?.email,
  });
}

export async function updateChatbotSettings(settings: ChatbotSettings) {
  return await apiRequest("PATCH", "/api/chatbot/settings", settings);
}

export async function getChatbotEmbedCode(businessId: number) {
  return await apiRequest("GET", `/api/chatbot/widget/${businessId}`, undefined);
}
