import { apiRequest } from "./queryClient";
import { insertWebsiteSchema } from "@shared/schema";
import { z } from "zod";

export interface TemplateCustomization {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  fonts: {
    headings: string;
    body: string;
  };
  logo?: string;
  sections: {
    hero: {
      title: string;
      subtitle: string;
      buttonText: string;
      backgroundImage?: string;
    };
    features: {
      title: string;
      items: {
        title: string;
        description: string;
        icon: string;
      }[];
    };
    products: {
      title: string;
      showFeatured: boolean;
      itemsPerRow: number;
    };
    about: {
      title: string;
      content: string;
      image?: string;
    };
    contact: {
      title: string;
      address?: string;
      phone?: string;
      email?: string;
      showMap: boolean;
    };
    footer: {
      showSocial: boolean;
      socialLinks: {
        platform: string;
        url: string;
      }[];
      copyright: string;
    };
  };
}

// Extended schema for website creation with customizations
export const createWebsiteSchema = insertWebsiteSchema.extend({
  customizations: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      background: z.string(),
      text: z.string(),
    }),
    fonts: z.object({
      headings: z.string(),
      body: z.string(),
    }),
    logo: z.string().optional(),
    sections: z.object({
      hero: z.object({
        title: z.string(),
        subtitle: z.string(),
        buttonText: z.string(),
        backgroundImage: z.string().optional(),
      }),
      features: z.object({
        title: z.string(),
        items: z.array(z.object({
          title: z.string(),
          description: z.string(),
          icon: z.string(),
        })),
      }),
      products: z.object({
        title: z.string(),
        showFeatured: z.boolean(),
        itemsPerRow: z.number().min(2).max(4),
      }),
      about: z.object({
        title: z.string(),
        content: z.string(),
        image: z.string().optional(),
      }),
      contact: z.object({
        title: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        showMap: z.boolean(),
      }),
      footer: z.object({
        showSocial: z.boolean(),
        socialLinks: z.array(z.object({
          platform: z.string(),
          url: z.string(),
        })),
        copyright: z.string(),
      }),
    }),
  }),
});

export type CreateWebsiteData = z.infer<typeof createWebsiteSchema>;

export async function getTemplates() {
  return await apiRequest("GET", "/api/templates", undefined);
}

export async function getTemplate(id: number) {
  return await apiRequest("GET", `/api/templates/${id}`, undefined);
}

export async function createWebsite(website: CreateWebsiteData) {
  return await apiRequest("POST", "/api/websites", website);
}

export async function getWebsites() {
  return await apiRequest("GET", "/api/websites", undefined);
}

export async function getWebsite(id: number) {
  return await apiRequest("GET", `/api/websites/${id}`, undefined);
}

export async function updateWebsite(id: number, data: Partial<CreateWebsiteData>) {
  return await apiRequest("PATCH", `/api/websites/${id}`, data);
}

// Default template customization
export const defaultCustomization: TemplateCustomization = {
  colors: {
    primary: "#0052CC",
    secondary: "#00B8D9",
    background: "#FAFBFC",
    text: "#172B4D",
  },
  fonts: {
    headings: "Inter, sans-serif",
    body: "Inter, sans-serif",
  },
  sections: {
    hero: {
      title: "Welcome to Your Online Store",
      subtitle: "Find the best products for your needs",
      buttonText: "Shop Now",
    },
    features: {
      title: "Why Choose Us",
      items: [
        {
          title: "Quality Products",
          description: "All our products are carefully selected for quality",
          icon: "star",
        },
        {
          title: "Fast Shipping",
          description: "Get your products delivered quickly",
          icon: "truck",
        },
        {
          title: "24/7 Support",
          description: "Our customer service team is always available",
          icon: "headphones",
        },
      ],
    },
    products: {
      title: "Featured Products",
      showFeatured: true,
      itemsPerRow: 3,
    },
    about: {
      title: "About Us",
      content: "We are a company dedicated to providing the best products for our customers.",
    },
    contact: {
      title: "Contact Us",
      showMap: true,
    },
    footer: {
      showSocial: true,
      socialLinks: [
        {
          platform: "facebook",
          url: "https://facebook.com",
        },
        {
          platform: "twitter",
          url: "https://twitter.com",
        },
        {
          platform: "instagram",
          url: "https://instagram.com",
        },
      ],
      copyright: "© 2023 Your Company. All rights reserved.",
    },
  },
};
