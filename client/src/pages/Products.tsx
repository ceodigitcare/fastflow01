import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import ProductCard from "@/components/products/ProductCard";
import ProductPanel from "@/components/products/ProductPanel";
import { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid3x3, List, Plus, Search, Star, Tag } from "lucide-react";

export default function Products() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterValue, setFilterValue] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Fetch products from the API
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Add a new product
  const addProductMutation = useMutation({
    mutationFn: async (newProduct: any) => {
      // Include all product data fields
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        imageUrl: newProduct.imageUrl,
        inStock: newProduct.inStock,
        sku: newProduct.sku,
        category: newProduct.category,
        inventory: newProduct.inventory,
        hasVariants: newProduct.hasVariants,
        variants: newProduct.variants,
        additionalImages: newProduct.additionalImages,
        weight: newProduct.weight,
        dimensions: newProduct.dimensions,
        tags: newProduct.tags,
        isFeatured: newProduct.isFeatured,
        isOnSale: newProduct.isOnSale,
        salePrice: newProduct.salePrice
        // We'll keep businessId handling on the server side
      };
      
      return await apiRequest("POST", "/api/products", productData);
    },
    onSuccess: () => {
      toast({
        title: "Product added",
        description: "Your product has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setPanelOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
      console.error("Add product error:", error);
    }
  });
  
  // Update an existing product
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Include all product data fields for updating
      const productData = {
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl,
        inStock: data.inStock,
        sku: data.sku,
        category: data.category,
        inventory: data.inventory,
        hasVariants: data.hasVariants,
        variants: data.variants,
        additionalImages: data.additionalImages,
        weight: data.weight,
        dimensions: data.dimensions,
        tags: data.tags,
        isFeatured: data.isFeatured,
        isOnSale: data.isOnSale,
        salePrice: data.salePrice
      };
      
      return await apiRequest("PATCH", `/api/products/${id}`, productData);
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setPanelOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
      console.error("Update product error:", error);
    }
  });
  
  // Delete a product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/products/${id}`, null);
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Your product has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
      console.error("Delete product error:", error);
    }
  });
  
  const handleOpenPanel = (product: Product | null = null) => {
    setEditingProduct(product);
    setPanelOpen(true);
  };
  
  const handleClosePanel = () => {
    setEditingProduct(null);
    setPanelOpen(false);
  };
  
  const handleSubmit = (data: any) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      addProductMutation.mutate(data);
    }
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };
  
  // Filter products based on search term and stock filter
  const filteredProducts = products?.filter(product => {
    // Search filter
    const matchesSearch = (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    
    // Stock filter
    let matchesStockFilter = true;
    if (filterValue === "in-stock") {
      matchesStockFilter = product.inStock === true;
    } else if (filterValue === "out-of-stock") {
      matchesStockFilter = product.inStock === false;
    } else if (filterValue === "featured") {
      matchesStockFilter = product.isFeatured === true;
    } else if (filterValue === "on-sale") {
      matchesStockFilter = product.isOnSale === true;
    }
    
    return matchesSearch && matchesStockFilter;
  })
  // Sort products: featured first, then by product name
  .sort((a, b) => {
    // First sort by featured status
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    
    // Then sort by name alphabetically
    return a.name.localeCompare(b.name);
  });
  
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-gray-500">Manage your store's products</p>
        </div>
        
        <Button onClick={() => handleOpenPanel()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Filter</SelectLabel>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="on-sale">On Sale</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button 
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-5">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="h-10 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <CardContent>
            <p className="text-destructive">Failed to load products. Please try again later.</p>
            <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/products"] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => handleOpenPanel(product)}
                onDelete={() => handleDelete(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 h-48 relative">
                    <img 
                      src={product.imageUrl || "https://placehold.co/400x400?text=No+Image"} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {!product.inStock && (
                        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                          Out of stock
                        </div>
                      )}
                      {product.isFeatured && (
                        <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded flex items-center">
                          <Star className="h-3 w-3 mr-1" /> Featured
                        </div>
                      )}
                      {product.isOnSale && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center">
                          <Tag className="h-3 w-3 mr-1" /> Sale
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{product.category || "Uncategorized"}</p>
                        <p className="text-sm line-clamp-2 mb-2">{product.description}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium">SKU:</span> {product.sku || "N/A"}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium">Inventory:</span> {product.inventory || 0} units
                        </div>
                        {product.hasVariants && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {product.variants?.length || 0} variants available
                          </div>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-right">
                        {product.isOnSale && product.salePrice ? (
                          <>
                            <span className="text-red-500">
                              ${((product.salePrice) / 100).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${((product.price || 0) / 100).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span>
                            ${((product.price || 0) / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col justify-end gap-2 p-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenPanel(product)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="p-6 text-center">
          <CardContent className="pt-6">
            {searchTerm || filterValue !== "all" ? (
              <>
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 
                    `No products match your search term "${searchTerm}".` : 
                    "No products match your filter criteria."} 
                  Try a different search or clear the filter.
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  )}
                  {filterValue !== "all" && (
                    <Button variant="outline" onClick={() => setFilterValue("all")}>
                      Clear Filter
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-gray-500">
                  Start adding products to your store to showcase them to your customers.
                </p>
                <Button className="mt-4" onClick={() => handleOpenPanel()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update your product details below."
                : "Fill in the details for your new product."}
            </DialogDescription>
          </DialogHeader>
          
          <ProductForm
            product={editingProduct}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            isSubmitting={addProductMutation.isPending || updateProductMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
