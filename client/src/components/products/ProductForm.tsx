// This file has been replaced by the integrated form in ProductPanel.tsx
// Leaving this as a placeholder to prevent import errors

import { Product } from "@shared/schema";

interface ProductFormProps {
  product: Product | null;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  activeTab?: string;
}

export default function ProductForm(_props: ProductFormProps) {
  return null;
}