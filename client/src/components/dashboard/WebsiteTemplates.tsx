import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Template } from "@shared/schema";

export default function WebsiteTemplates() {
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="relative h-40">
              <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="p-5">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates?.map((template) => (
        <Card key={template.id} className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
          <div className="relative h-40 overflow-hidden">
            <img
              src={template.previewUrl}
              alt={template.name}
              className="w-full h-full object-cover"
            />
            {template.isPopular && (
              <Badge className="absolute top-2 right-2 bg-success hover:bg-success">
                Popular
              </Badge>
            )}
          </div>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-1">{template.name}</h3>
            <p className="text-gray-500 text-sm mb-3">{template.description}</p>
            <div className="flex justify-between items-center">
              <Link href={`/website-builder/templates/${template.id}`}>
                <Button>
                  Customize
                </Button>
              </Link>
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
