import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { Template } from "@shared/schema";

interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
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
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{template.description}</p>
        <div className="flex justify-between items-center">
          <Button onClick={onSelect}>
            Customize
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
