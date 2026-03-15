import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Today's Sales", value: "Rp 0", icon: ShoppingCart, color: "text-accent" },
  { label: "Total Products", value: "0", icon: Package, color: "text-info" },
  { label: "Revenue (Month)", value: "Rp 0", icon: TrendingUp, color: "text-success" },
  { label: "Low Stock Alerts", value: "0", icon: AlertTriangle, color: "text-warning" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-description">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card flex items-start gap-4">
            <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-elevated-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No sales recorded yet</p>
            <p className="text-xs mt-1">Start by adding products and recording your first sale</p>
          </div>
        </div>

        <div className="card-elevated-md p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No alerts</p>
            <p className="text-xs mt-1">Products below threshold will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
