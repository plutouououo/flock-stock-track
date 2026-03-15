import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShoppingList = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Shopping List</h1>
          <p className="page-description">Plan your restocking orders</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="card-elevated-md">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">Shopping list is empty</p>
          <p className="text-sm mt-1">Low-stock products will be suggested here automatically</p>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
