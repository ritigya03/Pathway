import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskBadge } from "@/components/ui/status-badge";
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Globe,
  FileText,
  ChevronRight,
  Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { 
    label: "Total Suppliers", 
    value: "247", 
    change: "+12 this month",
    icon: Building2,
    trend: "up"
  },
  { 
    label: "Compliance Score", 
    value: "94%", 
    change: "+2.3% vs last month",
    icon: CheckCircle2,
    trend: "up"
  },
  { 
    label: "Active Alerts", 
    value: "8", 
    change: "3 critical",
    icon: AlertTriangle,
    trend: "warning"
  },
  { 
    label: "Documents Analyzed", 
    value: "1,284", 
    change: "Updated 2h ago",
    icon: FileText,
    trend: "neutral"
  },
];

const recentAlerts = [
  {
    id: 1,
    title: "Geopolitical tension in supplier region",
    supplier: "Meridian Electronics Ltd.",
    risk: "high" as const,
    time: "2 hours ago",
    type: "Geopolitical",
  },
  {
    id: 2,
    title: "Compliance certificate expiring soon",
    supplier: "Pacific Components Inc.",
    risk: "medium" as const,
    time: "5 hours ago",
    type: "Compliance",
  },
  {
    id: 3,
    title: "Negative media coverage detected",
    supplier: "Nordic Supply Co.",
    risk: "medium" as const,
    time: "8 hours ago",
    type: "Reputational",
  },
  {
    id: 4,
    title: "Port congestion affecting delivery",
    supplier: "Shanghai Logistics",
    risk: "low" as const,
    time: "12 hours ago",
    type: "Operational",
  },
];

const topSuppliers = [
  { name: "Global Tech Solutions", country: "Germany", score: 98, risk: "low" as const },
  { name: "Meridian Electronics", country: "Taiwan", score: 87, risk: "medium" as const },
  { name: "Pacific Components", country: "Japan", score: 92, risk: "low" as const },
  { name: "Nordic Supply Co.", country: "Sweden", score: 76, risk: "high" as const },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-8 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your supply chain compliance status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/20 text-primary text-sm">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="bg-card rounded-xl p-5 border border-border shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  stat.trend === "warning" 
                    ? "bg-warning/10 border border-warning/30" 
                    : "bg-accent border border-primary/20"
                }`}>
                  <stat.icon className={`w-5 h-5 ${
                    stat.trend === "warning" ? "text-warning" : "text-primary"
                  }`} />
                </div>
                {stat.trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="text-2xl font-bold mb-1 text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xs text-muted-foreground mt-2">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Alerts */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-foreground">Recent Alerts</h2>
              <Link to="/threats">
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.risk === "high" 
                      ? "bg-risk-high/10 border border-risk-high/30"
                      : alert.risk === "medium"
                      ? "bg-risk-medium/10 border border-risk-medium/30"
                      : "bg-risk-low/10 border border-risk-low/30"
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.risk === "high" 
                        ? "text-risk-high"
                        : alert.risk === "medium"
                        ? "text-risk-medium"
                        : "text-risk-low"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium mb-1 text-foreground">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.supplier}</p>
                      </div>
                      <RiskBadge level={alert.risk} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{alert.type}</span>
                      <span>•</span>
                      <span>{alert.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-foreground">Top Suppliers</h2>
              <Link to="/compliance">
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {topSuppliers.map((supplier) => (
                <div 
                  key={supplier.name}
                  className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-foreground">{supplier.name}</p>
                    <RiskBadge level={supplier.risk} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      {supplier.country}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${supplier.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{supplier.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Link to="/compliance" className="bg-card rounded-xl p-5 border border-border hover:border-primary/30 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center group-hover:bg-secondary transition-colors">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Run Compliance Check</p>
                <p className="text-sm text-muted-foreground">Query your documents</p>
              </div>
            </div>
          </Link>
          <Link to="/threats" className="bg-card rounded-xl p-5 border border-border hover:border-warning/30 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Threat Intel</p>
                <p className="text-sm text-muted-foreground">Real-time monitoring</p>
              </div>
            </div>
          </Link>
          <Link to="/register" className="bg-card rounded-xl p-5 border border-border hover:border-success/30 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Add Supplier</p>
                <p className="text-sm text-muted-foreground">Upload new documents</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
