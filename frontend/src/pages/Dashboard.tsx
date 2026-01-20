import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskBadge } from "@/components/ui/status-badge";
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight,
  Users,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Import all threat graph components
import {
  ComplianceRiskChart,
  ComplianceScoreChart,
  OperationalPerformanceChart,
  OperationalCapacityChart,
  GeographicalRiskChart,
  GeographicalStabilityChart,
  ReputationalSentimentChart,
  ReputationalESGChart
} from "../components/ThreatGraphs";

const API_BASE = "http://localhost:8001";

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    avgCompliance: 0,
    highRiskCount: 0,
    analyzedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [buyerCompany, setBuyerCompany] = useState("");

  useEffect(() => {
    loadDashboardData();
    loadBuyerInfo();
  }, []);

  const loadBuyerInfo = () => {
    const storedBuyer = localStorage.getItem("buyer_company_name");
    if (storedBuyer) {
      setBuyerCompany(storedBuyer);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/suppliers`);
      const data = await response.json();

      if (response.ok && data.success) {
        const supplierList = data.suppliers || [];
        setSuppliers(supplierList);
        calculateStats(supplierList);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (supplierList) => {
    const total = supplierList.length;
    const analyzed = supplierList.filter(s => s.score > 0);
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, s) => sum + s.score, 0) / analyzed.length)
      : 0;
    const highRisk = supplierList.filter(s => s.risk === 'high').length;

    setStats({
      totalSuppliers: total,
      avgCompliance: avgScore,
      highRiskCount: highRisk,
      analyzedCount: analyzed.length
    });
  };

  const StatCard = ({ icon: Icon, label, value, change, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trend === "warning"
              ? "bg-warning/10 border border-warning/30"
              : "bg-accent border border-primary/20"
            }`}>
            <Icon className={`w-5 h-5 ${trend === "warning" ? "text-warning" : "text-primary"
              }`} />
          </div>
          {trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {change && <div className="text-xs text-muted-foreground mt-2">{change}</div>}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Threat Intelligence Dashboard</h1>
            <p className="text-muted-foreground">
              Multi-dimensional risk analysis for {buyerCompany || "your company"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/20 text-primary text-sm">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              System operational
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Building2}
            label="Total Suppliers"
            value={stats.totalSuppliers}
            change={`${stats.analyzedCount} analyzed`}
            trend="neutral"
          />
          <StatCard
            icon={CheckCircle2}
            label="Avg Compliance Score"
            value={`${stats.avgCompliance}%`}
            change={stats.analyzedCount > 0 ? "Based on analyzed suppliers" : "No analysis yet"}
            trend={stats.avgCompliance >= 80 ? "up" : "neutral"}
          />
          <StatCard
            icon={AlertTriangle}
            label="High Risk Suppliers"
            value={stats.highRiskCount}
            change={stats.highRiskCount > 0 ? "Requires attention" : "All clear"}
            trend={stats.highRiskCount > 0 ? "warning" : "neutral"}
          />
          <StatCard
            icon={FileText}
            label="Documents Analyzed"
            value={stats.analyzedCount}
            change={`Out of ${stats.totalSuppliers} total`}
            trend="neutral"
          />
        </div>

        {/* COMPLIANCE THREAT SECTION */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Compliance Threat</h2>
              <p className="text-sm text-muted-foreground">Regulatory and policy compliance monitoring</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComplianceRiskChart suppliers={suppliers} />
            <ComplianceScoreChart suppliers={suppliers} />
          </div>
        </div>

        {/* OPERATIONAL THREAT SECTION */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Operational Threat</h2>
              <p className="text-sm text-muted-foreground">Supply chain disruption and capacity risks</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OperationalPerformanceChart suppliers={suppliers} />
            <OperationalCapacityChart suppliers={suppliers} />
          </div>
        </div>

        {/* GEOGRAPHICAL THREAT SECTION */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Geographical Threat</h2>
              <p className="text-sm text-muted-foreground">Location-based risk assessment and regional stability</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GeographicalRiskChart suppliers={suppliers} />
            <GeographicalStabilityChart suppliers={suppliers} />
          </div>
        </div>

        {/* REPUTATIONAL THREAT SECTION */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Reputational Threat</h2>
              <p className="text-sm text-muted-foreground">Brand risk and public perception monitoring</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReputationalSentimentChart suppliers={suppliers} />
            <ReputationalESGChart suppliers={suppliers} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Analyses</CardTitle>
              <a href="/compliance">
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </a>
            </CardHeader>
            <CardContent>
              {suppliers.filter(s => s.score > 0).length > 0 ? (
                <div className="space-y-3">
                  {suppliers
                    .filter(s => s.score > 0)
                    .slice(0, 5)
                    .map((supplier) => (
                      <div
                        key={supplier.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">Compliance: {supplier.score}%</p>
                          </div>
                        </div>
                        <RiskBadge level={supplier.risk} />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No analyses yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Run your first compliance check
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Risk Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Low Risk Suppliers</span>
                  <span className="font-bold text-success">
                    {suppliers.filter(s => s.risk === 'low').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Medium Risk Suppliers</span>
                  <span className="font-bold text-warning">
                    {suppliers.filter(s => s.risk === 'medium').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">High Risk Suppliers</span>
                  <span className="font-bold text-destructive">
                    {suppliers.filter(s => s.risk === 'high').length}
                  </span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Compliance Rate</span>
                    <span className="font-bold text-primary">
                      {stats.analyzedCount > 0
                        ? Math.round((suppliers.filter(s => s.score >= 70).length / stats.analyzedCount) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/compliance" className="block">
            <Card className="hover:border-primary/30 hover:shadow-md transition-all group h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center group-hover:bg-secondary transition-colors">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Run Compliance Check</p>
                    <p className="text-sm text-muted-foreground">Analyze transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>

          <a href="/register" className="block">
            <Card className="hover:border-success/30 hover:shadow-md transition-all group h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Building2 className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Add Supplier</p>
                    <p className="text-sm text-muted-foreground">Upload documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>

          <Card className="hover:border-primary/30 hover:shadow-md transition-all group h-full cursor-pointer" onClick={loadDashboardData}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center group-hover:bg-secondary transition-colors">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Refresh Data</p>
                  <p className="text-sm text-muted-foreground">Update dashboard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}