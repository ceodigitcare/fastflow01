import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  MessageSquare, 
  HelpCircle,
  BookOpen,
  Mail,
  Phone,
  Video,
  FileText,
  PlayCircle,
  ShoppingCart,
  Users,
  Settings,
  Store,
  AlertCircle
} from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Help & Support</h1>
          <p className="text-sm text-gray-500">Find answers and get assistance</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Contact Support</span>
        </Button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="search"
          placeholder="Search for help, tutorials, and FAQs..."
          className="pl-10 py-6 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid grid-cols-4 sm:w-[600px]">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="faq">FAQs</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <Store className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Setting Up Your Store</CardTitle>
                <CardDescription>Learn how to set up your store and add products</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <a href="#" className="hover:underline">Creating your business profile</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <a href="#" className="hover:underline">Adding your first products</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <a href="#" className="hover:underline">Customizing your store appearance</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <a href="#" className="hover:underline">Setting up payment options</a>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" size="sm">
                  View All Setup Guides
                </Button>
              </CardFooter>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>AI Chatbot Setup</CardTitle>
                <CardDescription>Set up and customize your AI chatbot</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                    <a href="#" className="hover:underline">Configuring your chatbot</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                    <a href="#" className="hover:underline">Customizing AI responses</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                    <a href="#" className="hover:underline">Setting up product recommendations</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                    <a href="#" className="hover:underline">Embedding chatbot on your website</a>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" size="sm">
                  View Chatbot Guides
                </Button>
              </CardFooter>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Website Builder</CardTitle>
                <CardDescription>Create and customize your website</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    <a href="#" className="hover:underline">Choosing the right template</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    <a href="#" className="hover:underline">Customizing your website</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    <a href="#" className="hover:underline">Adding product sections</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    <a href="#" className="hover:underline">Publishing your website</a>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" size="sm">
                  View Website Guides
                </Button>
              </CardFooter>
            </Card>
          </div>

          <h2 className="text-xl font-semibold mt-10 mb-4">Video Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Getting Started with Storefront",
                duration: "5:32",
                thumbnail: "/thumbnail-1.jpg",
                description: "A complete walkthrough of setting up your store"
              },
              {
                title: "Setting Up Your AI Chatbot",
                duration: "4:15",
                thumbnail: "/thumbnail-2.jpg",
                description: "Learn how to configure and customize your chatbot"
              },
              {
                title: "Creating Your First Website",
                duration: "7:48",
                thumbnail: "/thumbnail-3.jpg",
                description: "Build a professional website with our templates"
              }
            ].map((video, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-white opacity-80" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base">{video.title}</CardTitle>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions about our platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I add products to my store?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      To add products to your store, navigate to the Products section in your dashboard. 
                      Click the "Add Product" button and fill in the product details including name, 
                      description, price, and images. You can also add variants such as sizes and colors.
                      Once complete, click "Save" to publish the product to your store.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How does the AI chatbot work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Our AI chatbot uses Google's Gemini AI technology to provide intelligent responses 
                      to customer inquiries. It can answer questions about your products, provide recommendations
                      based on customer preferences, and even process orders directly within the chat. The chatbot
                      learns from interactions to improve over time. You can customize the chatbot's behavior
                      and responses in the Chatbot Settings section.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Can I customize my website template?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Yes, all website templates are fully customizable. You can change colors, fonts, 
                      layout, and content to match your brand. You can also add, remove, or rearrange 
                      sections like hero banners, product showcases, about us, and contact information. 
                      The customization is done through our visual editor which requires no coding knowledge.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>How do I track my store's performance?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      You can track your store's performance through the Analytics dashboard. It provides 
                      metrics on sales, revenue, popular products, customer acquisition, and chatbot performance.
                      You can filter data by date ranges and export reports. The dashboard is updated in real-time
                      to give you the most current information on your business performance.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>What payment methods are supported?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Our platform supports various payment methods including credit/debit cards, 
                      PayPal, Apple Pay, Google Pay, and bank transfers. You can configure which 
                      payment methods to accept in the Settings section. We use secure payment 
                      processing to ensure all transactions are safe and encrypted.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>How do I manage customer data and privacy?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Customer data is stored securely in compliance with data protection regulations. 
                      You can manage customer information in the Customers section and export data as needed.
                      We provide tools to help you comply with privacy laws like GDPR and CCPA, including 
                      consent management and data deletion capabilities.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger>Can I connect my own domain to my store?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      Yes, you can connect your own domain to your store. Go to the Settings section, 
                      then "Domains", and follow the instructions to connect your domain. You'll need 
                      to update your DNS settings at your domain registrar. We also provide free subdomains 
                      if you don't have your own domain yet.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger>Is there a limit to how many products I can add?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600">
                      The number of products you can add depends on your subscription plan. Basic plans 
                      allow up to 100 products, while premium plans offer unlimited products. You can 
                      view your current limits and upgrade your plan in the Account section if needed.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Video Tutorials</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Written Guides
                </Button>
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  All Videos
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Getting Started with Storefront",
                  duration: "5:32",
                  thumbnail: "/thumbnail-1.jpg",
                  category: "Basics",
                  views: "12K"
                },
                {
                  title: "Setting Up Your AI Chatbot",
                  duration: "4:15",
                  thumbnail: "/thumbnail-2.jpg",
                  category: "AI Features",
                  views: "8.5K"
                },
                {
                  title: "Creating Your First Website",
                  duration: "7:48",
                  thumbnail: "/thumbnail-3.jpg",
                  category: "Website Builder",
                  views: "10K"
                },
                {
                  title: "Processing Orders and Payments",
                  duration: "6:22",
                  thumbnail: "/thumbnail-4.jpg",
                  category: "Orders",
                  views: "7.2K"
                },
                {
                  title: "Understanding Analytics",
                  duration: "5:45",
                  thumbnail: "/thumbnail-5.jpg",
                  category: "Analytics",
                  views: "6.8K"
                },
                {
                  title: "Managing Product Inventory",
                  duration: "4:56",
                  thumbnail: "/thumbnail-6.jpg",
                  category: "Products",
                  views: "9.1K"
                }
              ].map((video, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="relative aspect-video bg-gray-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{video.title}</CardTitle>
                      <Badge variant="outline">{video.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      {video.views} views
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator className="my-8" />

            <h2 className="text-xl font-semibold mb-4">Written Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Store Setup Guide</CardTitle>
                  <CardDescription>A comprehensive guide to setting up your store</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Business profile setup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Product catalog management</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Payment and shipping configuration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Tax and legal compliance</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Read Guide</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Chatbot Configuration</CardTitle>
                  <CardDescription>Learn how to set up and optimize your AI chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Basic chatbot setup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Training for product recommendations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Order processing via chatbot</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Analytics and performance optimization</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Read Guide</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Email Support</CardTitle>
                <CardDescription>Get help via email</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Our support team typically responds within 24 hours on business days.
                </p>
                <Button className="w-full">
                  Email Support Team
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Live Chat</CardTitle>
                <CardDescription>Chat with our support team</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Available Monday-Friday, 9am-5pm EST. Get immediate assistance with your questions.
                </p>
                <Button className="w-full">
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <Phone className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Phone Support</CardTitle>
                <CardDescription>Speak directly with our team</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  For Premium and Enterprise customers. Available during business hours.
                </p>
                <Button className="w-full">
                  View Phone Numbers
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>Our team will get back to you as quickly as possible</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Your Name</label>
                    <Input id="name" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <Input id="email" type="email" placeholder="Enter your email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                  <Input id="subject" placeholder="Enter subject" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Category</label>
                  <select id="category" className="w-full rounded-md border border-input bg-background px-3 py-2">
                    <option value="">Select a category</option>
                    <option value="account">Account Issues</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="products">Product Management</option>
                    <option value="chatbot">AI Chatbot</option>
                    <option value="website">Website Builder</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <textarea 
                    id="message" 
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 resize-none" 
                    placeholder="Describe your issue in detail"
                  ></textarea>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="attachScreenshot" className="rounded border-input" />
                  <label htmlFor="attachScreenshot" className="text-sm">I'd like to attach screenshots</label>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Submit Ticket</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}