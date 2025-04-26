import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Template } from "@shared/schema";
import TemplateCard from "@/components/website-builder/TemplateCard";
import TemplateCustomizer from "@/components/website-builder/TemplateCustomizer";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PlusIcon } from "lucide-react";

export default function WebsiteBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customizing, setCustomizing] = useState(false);
  
  // Fetch all templates
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });
  
  // Fetch user's websites
  const { data: websites, isLoading: websitesLoading } = useQuery({
    queryKey: ["/api/websites"],
  });
  
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomizing(true);
  };
  
  const handleCancelCustomization = () => {
    setSelectedTemplate(null);
    setCustomizing(false);
  };
  
  return (
    <MainLayout>
      {customizing && selectedTemplate ? (
        <TemplateCustomizer 
          template={selectedTemplate} 
          onCancel={handleCancelCustomization}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Website Builder</h1>
              <p className="text-sm text-gray-500">Create and manage your e-commerce website</p>
            </div>
          </div>
          
          <Tabs defaultValue="templates" className="mb-8">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="my-websites">My Websites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  Array(6).fill(0).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <div className="h-40 bg-gray-200 rounded-t-lg"></div>
                      <CardContent className="p-5">
                        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                        <div className="h-10 bg-gray-200 rounded w-32"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  templates?.map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="my-websites" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {websitesLoading ? (
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <div className="h-40 bg-gray-200 rounded-t-lg"></div>
                      <CardContent className="p-5">
                        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                        <div className="h-10 bg-gray-200 rounded w-32"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : websites?.length ? (
                  websites.map((website: any) => (
                    <Card key={website.id} className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
                      <div className="relative h-40 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {website.customizations?.logo ? (
                          <img 
                            src={website.customizations.logo} 
                            alt={website.name} 
                            className="max-h-full max-w-full"
                          />
                        ) : (
                          <div className="text-gray-400 font-medium">{website.name}</div>
                        )}
                        {website.isActive && (
                          <div className="absolute top-2 right-2 bg-success text-white text-xs px-2 py-1 rounded">
                            Live
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-semibold mb-1">{website.name}</h3>
                        <p className="text-gray-500 text-sm mb-3">
                          Created on {new Date(website.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex justify-between items-center">
                          <Button 
                            onClick={() => window.open(`/website-builder/edit/${website.id}`, '_blank')}
                          >
                            Edit
                          </Button>
                          <Button variant="outline" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full p-8 text-center">
                    <CardHeader>
                      <CardTitle>No Websites Yet</CardTitle>
                      <CardDescription>
                        Get started by creating your first website using one of our templates.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => document.querySelector('[value="templates"]')?.dispatchEvent(new Event('click'))}
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Create Website
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </MainLayout>
  );
}
