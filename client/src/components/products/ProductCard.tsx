import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Edit, Trash } from "lucide-react";
import { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
      <div className="relative h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="text-gray-400">No image</div>
        )}
        {!product.inStock && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-gray-800 text-white">
            Out of Stock
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <span className="font-medium text-primary">
            {formatCurrency(product.price / 100)}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
