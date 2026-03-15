import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Products = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Products</h1>
          <p className="page-description">Manage your poultry product catalog</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search products by name or SKU..." className="pl-9" />
      </div>

      <div className="card-elevated-md">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm mt-1">Add your first poultry product to get started</p>
        </div>
      </div>
    </div>
  );
};

export default Products;
