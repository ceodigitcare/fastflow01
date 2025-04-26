import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Edit, Trash, Star, Tag } from "lucide-react";
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
        <div className="absolute top-2 right-2 flex gap-2">
          {!product.inStock && (
            <Badge variant="secondary" className="bg-gray-800 text-white">
              Out of Stock
            </Badge>
          )}
          {product.isFeatured && (
            <Badge variant="secondary" className="bg-amber-500 text-white">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
          {product.isOnSale && (
            <Badge variant="secondary" className="bg-red-500 text-white">
              <Tag className="h-3 w-3 mr-1" /> Sale
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <div className="text-right">
            {product.isOnSale && product.salePrice ? (
              <>
                <span className="font-medium text-red-500">
                  {formatCurrency(product.salePrice / 100)}
                </span>
                <span className="ml-2 text-sm text-gray-500 line-through">
                  {formatCurrency(product.price / 100)}
                </span>
              </>
            ) : (
              <span className="font-medium text-primary">
                {formatCurrency(product.price / 100)}
              </span>
            )}
          </div>
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
