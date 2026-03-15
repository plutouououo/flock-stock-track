import { ShoppingCart } from "lucide-react";

const RecordSale = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Record Sale</h1>
        <p className="page-description">Create a new sales transaction</p>
      </div>

      <div className="card-elevated-md">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">Sales recording coming soon</p>
          <p className="text-sm mt-1">Add products first, then start recording sales</p>
        </div>
      </div>
    </div>
  );
};

export default RecordSale;
