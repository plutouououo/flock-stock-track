import { BarChart3 } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Sales Reports</h1>
        <p className="page-description">Track revenue, COGS, and business performance</p>
      </div>

      <div className="card-elevated-md">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Reports will populate once you start recording sales</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
