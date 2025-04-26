import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  BookOpen, 
  Code, 
  Copy,
  ExternalLink,
  ChevronRight,
  Download,
  Hash,
  FileText,
  Box,
  MessageSquare,
  Database,
  LayoutGrid,
  Settings,
  ShoppingBag
} from 'lucide-react';

type DocSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  // API Documentation sections
  const apiSections: DocSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">API Overview</h2>
          <p className="text-gray-600">
            The Storefront API allows you to programmatically access and manipulate your store data. You can use our API to create and manage products, process orders, update your website, and more.
          </p>
          <h3 className="text-lg font-medium mt-6">Base URL</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            https://api.storefront.com/v1
          </div>
          <h3 className="text-lg font-medium mt-6">Authentication</h3>
          <p className="text-gray-600">
            All API requests require authentication using an API key. You can generate an API key in your account settings.
          </p>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            Authorization: Bearer YOUR_API_KEY
          </div>
          <h3 className="text-lg font-medium mt-6">Rate Limits</h3>
          <p className="text-gray-600">
            The API is rate limited to 100 requests per minute. If you exceed this limit, you'll receive a 429 Too Many Requests response.
          </p>
          <div className="flex items-center gap-2 mt-6">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download OpenAPI Spec
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              API Reference
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'authentication',
      title: 'Authentication',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Authentication</h2>
          <p className="text-gray-600">
            To authenticate with the API, you need to include your API key in the header of each request.
          </p>
          
          <h3 className="text-lg font-medium mt-6">Generating an API Key</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 pl-4">
            <li>Navigate to Settings in your dashboard</li>
            <li>Select the API tab</li>
            <li>Click "Generate New API Key"</li>
            <li>Give your key a name and select the appropriate permissions</li>
            <li>Click "Create API Key"</li>
          </ol>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Keep your API keys secure. Do not share them in public repositories or client-side code.
                </p>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mt-6">Request Header</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm relative group">
            <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 hidden group-hover:block" onClick={() => navigator.clipboard.writeText('Authorization: Bearer YOUR_API_KEY')}>
              <Copy className="h-4 w-4" />
            </button>
            Authorization: Bearer YOUR_API_KEY
          </div>
          
          <h3 className="text-lg font-medium mt-6">Example Request</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm relative group">
            <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 hidden group-hover:block" onClick={() => navigator.clipboard.writeText('curl -X GET https://api.storefront.com/v1/products \\\n  -H "Authorization: Bearer YOUR_API_KEY"')}>
              <Copy className="h-4 w-4" />
            </button>
            curl -X GET https://api.storefront.com/v1/products \<br />
            {'  '}-H "Authorization: Bearer YOUR_API_KEY"
          </div>
        </div>
      )
    },
    {
      id: 'products',
      title: 'Products API',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Products API</h2>
          <p className="text-gray-600">
            The Products API allows you to create, read, update, and delete products in your store.
          </p>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              List Products
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /products
            </div>
            <p className="text-gray-600 mt-2">
              Returns a list of all products in your store.
            </p>
            <h4 className="font-medium mt-4">Query Parameters</h4>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  <tr>
                    <td className="px-4 py-2">limit</td>
                    <td className="px-4 py-2">integer</td>
                    <td className="px-4 py-2">Number of products to return (default: 20, max: 100)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">offset</td>
                    <td className="px-4 py-2">integer</td>
                    <td className="px-4 py-2">Number of products to skip (default: 0)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">sort</td>
                    <td className="px-4 py-2">string</td>
                    <td className="px-4 py-2">Sort by field: name, price, created (default: created)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h4 className="font-medium mt-4">Example Response</h4>
            <div className="bg-gray-100 p-3 rounded-md font-mono text-sm text-gray-800 mt-2 overflow-auto max-h-60">
              {`{
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "description": "Product description",
      "price": 29.99,
      "imageUrl": "https://example.com/image.jpg",
      "inStock": true,
      "createdAt": "2023-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Another Product",
      "description": "Another description",
      "price": 19.99,
      "imageUrl": "https://example.com/image2.jpg",
      "inStock": true,
      "createdAt": "2023-01-02T00:00:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}`}
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold mr-2">POST</div>
              Create Product
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              POST /products
            </div>
            <p className="text-gray-600 mt-2">
              Creates a new product in your store.
            </p>
            <h4 className="font-medium mt-4">Request Body</h4>
            <div className="bg-gray-100 p-3 rounded-md font-mono text-sm text-gray-800 mt-2 overflow-auto">
              {`{
  "name": "Product Name",
  "description": "Product description",
  "price": 29.99,
  "imageUrl": "https://example.com/image.jpg",
  "inStock": true
}`}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'orders',
      title: 'Orders API',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Orders API</h2>
          <p className="text-gray-600">
            The Orders API allows you to retrieve and manage orders from your store.
          </p>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              List Orders
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /orders
            </div>
            <p className="text-gray-600 mt-2">
              Returns a list of all orders in your store.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              Get Order
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /orders/{'{id}'}
            </div>
            <p className="text-gray-600 mt-2">
              Returns details of a specific order.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold mr-2">PATCH</div>
              Update Order Status
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              PATCH /orders/{'{id}'}/status
            </div>
            <p className="text-gray-600 mt-2">
              Updates the status of an order.
            </p>
            <h4 className="font-medium mt-4">Request Body</h4>
            <div className="bg-gray-100 p-3 rounded-md font-mono text-sm text-gray-800 mt-2">
              {`{
  "status": "shipped"
}`}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'chatbot',
      title: 'Chatbot API',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Chatbot API</h2>
          <p className="text-gray-600">
            The Chatbot API allows you to configure and manage your AI chatbot.
          </p>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              Get Chatbot Settings
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /chatbot/settings
            </div>
            <p className="text-gray-600 mt-2">
              Returns the current settings of your chatbot.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold mr-2">PATCH</div>
              Update Chatbot Settings
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              PATCH /chatbot/settings
            </div>
            <p className="text-gray-600 mt-2">
              Updates the settings of your chatbot.
            </p>
            <h4 className="font-medium mt-4">Request Body</h4>
            <div className="bg-gray-100 p-3 rounded-md font-mono text-sm text-gray-800 mt-2">
              {`{
  "name": "Sales Assistant",
  "welcomeMessage": "Hello! How can I help you today?",
  "enableRecommendations": true,
  "allowOrderCreation": true,
  "enableOrderTracking": true,
  "widgetPosition": "bottomRight"
}`}
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              Get Chatbot Embed Code
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /chatbot/embed
            </div>
            <p className="text-gray-600 mt-2">
              Returns the HTML code to embed the chatbot on an external website.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'websites',
      title: 'Websites API',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Websites API</h2>
          <p className="text-gray-600">
            The Websites API allows you to manage your website settings and content.
          </p>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">GET</div>
              List Websites
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              GET /websites
            </div>
            <p className="text-gray-600 mt-2">
              Returns a list of all websites for your business.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold mr-2">POST</div>
              Create Website
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              POST /websites
            </div>
            <p className="text-gray-600 mt-2">
              Creates a new website for your business.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium flex items-center">
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold mr-2">PATCH</div>
              Update Website
            </h3>
            <div className="bg-gray-100 p-2 rounded-md font-mono text-sm mt-2">
              PATCH /websites/{'{id}'}
            </div>
            <p className="text-gray-600 mt-2">
              Updates a website's settings and content.
            </p>
          </div>
        </div>
      )
    }
  ];

  // SDK Documentation sections
  const sdkSections: DocSection[] = [
    {
      id: 'javascript',
      title: 'JavaScript SDK',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">JavaScript SDK</h2>
          <p className="text-gray-600">
            Our JavaScript SDK allows you to interact with the Storefront API from a browser or Node.js environment.
          </p>
          
          <h3 className="text-lg font-medium mt-6">Installation</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            npm install @storefront/sdk
          </div>
          
          <h3 className="text-lg font-medium mt-6">Usage</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            {`import { StorefrontClient } from '@storefront/sdk';

const client = new StorefrontClient('YOUR_API_KEY');

// Get all products
const products = await client.products.list();

// Create a product
const newProduct = await client.products.create({
  name: 'New Product',
  price: 29.99,
  description: 'Product description'
});`}
          </div>
          
          <h3 className="text-lg font-medium mt-6">Methods</h3>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                <tr>
                  <td className="px-4 py-2 font-mono">products.list()</td>
                  <td className="px-4 py-2">Get all products</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.get(id)</td>
                  <td className="px-4 py-2">Get a specific product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.create(data)</td>
                  <td className="px-4 py-2">Create a new product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.update(id, data)</td>
                  <td className="px-4 py-2">Update a product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.delete(id)</td>
                  <td className="px-4 py-2">Delete a product</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'python',
      title: 'Python SDK',
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Python SDK</h2>
          <p className="text-gray-600">
            Our Python SDK allows you to interact with the Storefront API from Python applications.
          </p>
          
          <h3 className="text-lg font-medium mt-6">Installation</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            pip install storefront-sdk
          </div>
          
          <h3 className="text-lg font-medium mt-6">Usage</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
            {`from storefront import StorefrontClient

client = StorefrontClient('YOUR_API_KEY')

# Get all products
products = client.products.list()

# Create a product
new_product = client.products.create({
    'name': 'New Product',
    'price': 29.99,
    'description': 'Product description'
})`}
          </div>
          
          <h3 className="text-lg font-medium mt-6">Methods</h3>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                <tr>
                  <td className="px-4 py-2 font-mono">products.list()</td>
                  <td className="px-4 py-2">Get all products</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.get(id)</td>
                  <td className="px-4 py-2">Get a specific product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.create(data)</td>
                  <td className="px-4 py-2">Create a new product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.update(id, data)</td>
                  <td className="px-4 py-2">Update a product</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">products.delete(id)</td>
                  <td className="px-4 py-2">Delete a product</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  ];

  // Function to filter sections by search query
  const filterSections = (sections: DocSection[], query: string) => {
    if (!query) return sections;
    return sections.filter(section => 
      section.title.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredApiSections = filterSections(apiSections, searchQuery);
  const filteredSdkSections = filterSections(sdkSections, searchQuery);

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Documentation</h1>
          <p className="text-sm text-gray-500">API references and developer resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Docs
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Need Help?
          </Button>
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="search"
          placeholder="Search documentation..."
          className="pl-10 py-6 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>API Reference</span>
          </TabsTrigger>
          <TabsTrigger value="sdk" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span>SDK Documentation</span>
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Development Guides</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Resources</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>API Reference</CardTitle>
                <CardDescription>Explore our API endpoints</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="px-4 pb-4">
                    {filteredApiSections.map((section) => (
                      <div
                        key={section.id}
                        className={`py-2 cursor-pointer flex items-center ${
                          activeSection === section.id ? 'text-primary font-medium' : 'text-gray-600'
                        }`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        {activeSection === section.id && (
                          <div className="w-1 h-5 bg-primary rounded-full mr-2" />
                        )}
                        <span>{section.title}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardContent className="pt-6">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="pr-4">
                    {filteredApiSections.find(s => s.id === activeSection)?.content || (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Search className="h-12 w-12 mb-4" />
                        <p>Select a section from the sidebar</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sdk">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>SDK Documentation</CardTitle>
                <CardDescription>Available client libraries</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-4">
                  {filteredSdkSections.map((section) => (
                    <div
                      key={section.id}
                      className={`py-2 cursor-pointer flex items-center ${
                        activeSection === section.id ? 'text-primary font-medium' : 'text-gray-600'
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      {activeSection === section.id && (
                        <div className="w-1 h-5 bg-primary rounded-full mr-2" />
                      )}
                      <span>{section.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardContent className="pt-6">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="pr-4">
                    {filteredSdkSections.find(s => s.id === activeSection)?.content || (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Box className="h-12 w-12 mb-4" />
                        <p>Select an SDK from the sidebar</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guides">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Products Integration</CardTitle>
                <CardDescription>Learn how to manage products programmatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  This guide covers how to effectively use our API to create, update, and manage products.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Creating products via API</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Bulk product updates</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Product image upload best practices</a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Chatbot Development</CardTitle>
                <CardDescription>Customize and extend your AI chatbot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Learn how to integrate and customize the AI chatbot for your specific business needs.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Custom chatbot responses</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Product recommendation algorithms</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Integrating with external systems</a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <LayoutGrid className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Website Templates</CardTitle>
                <CardDescription>Extending and customizing website templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Learn how to modify website templates beyond the built-in customization options.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Advanced template customization</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Custom CSS and theming</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Adding custom sections and components</a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Working with customer and order data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Learn how to manage, export, and analyze customer and order data effectively.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Customer data exports</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Order data analysis</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Data privacy compliance</a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <Settings className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>Advanced platform configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Discover advanced configuration options for power users and developers.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Webhooks and event subscribers</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Custom authentication flows</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Rate limiting and optimization</a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
                  <Hash className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Webhook Integrations</CardTitle>
                <CardDescription>Connect with external services using webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Learn how to use webhooks to connect your store with external services and systems.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Setting up webhook endpoints</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Order fulfillment integrations</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <a href="#" className="hover:underline">Inventory management systems</a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Developer Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <Code className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">API Playground</h3>
                      <p className="text-sm text-gray-500">Interactive API testing environment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <Box className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">SDK Downloads</h3>
                      <p className="text-sm text-gray-500">Download client libraries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">Code Samples</h3>
                      <p className="text-sm text-gray-500">Example code for common tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sample Applications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">React Demo Store</h3>
                      <p className="text-sm text-gray-500">Complete React storefront implementation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">Chatbot Demo</h3>
                      <p className="text-sm text-gray-500">Sample chatbot implementation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">Order Management</h3>
                      <p className="text-sm text-gray-500">Order processing application</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Community Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                      <path d="M9 18c-4.51 2-5-2-7-2"/>
                    </svg>
                    <div>
                      <h3 className="font-medium">GitHub Repository</h3>
                      <p className="text-sm text-gray-500">Source code and examples</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                    </svg>
                    <div>
                      <h3 className="font-medium">Twitter Community</h3>
                      <p className="text-sm text-gray-500">Latest updates and discussions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m10 9 5 3-5 3z"/>
                    </svg>
                    <div>
                      <h3 className="font-medium">Video Tutorials</h3>
                      <p className="text-sm text-gray-500">Step-by-step video guides</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Changelog</CardTitle>
                <CardDescription>Recent platform and API updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border-l-2 border-primary pl-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v2.3.0</Badge>
                      <span className="text-sm text-gray-500">April 15, 2025</span>
                    </div>
                    <h3 className="text-lg font-medium mt-2">Enhanced Chatbot Capabilities</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• Added product specific training options for chatbot</li>
                      <li>• Improved recommendation algorithm</li>
                      <li>• New chatbot analytics dashboard</li>
                      <li>• Added support for audio messages</li>
                    </ul>
                  </div>

                  <div className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v2.2.0</Badge>
                      <span className="text-sm text-gray-500">March 22, 2025</span>
                    </div>
                    <h3 className="text-lg font-medium mt-2">Website Builder Updates</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• Added 3 new website templates</li>
                      <li>• Improved mobile responsiveness</li>
                      <li>• New section types: Testimonials and FAQ</li>
                      <li>• Enhanced color customization options</li>
                    </ul>
                  </div>

                  <div className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v2.1.0</Badge>
                      <span className="text-sm text-gray-500">February 10, 2025</span>
                    </div>
                    <h3 className="text-lg font-medium mt-2">API and SDK Improvements</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• Added bulk product import/export endpoints</li>
                      <li>• Enhanced error responses with more detailed information</li>
                      <li>• New JavaScript and Python SDK versions</li>
                      <li>• Added webhooks for order status changes</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}