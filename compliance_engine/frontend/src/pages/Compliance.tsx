import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge, StatusBadge } from "@/components/ui/status-badge";
import { 
  Search, 
  Send, 
  Building2, 
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

interface Supplier {
  id: number;
  name: string;
  status: "ready" | "indexed" | "processing";
  score: number;
  risk: "low" | "medium" | "high";
}

interface QueryResult {
  score: number;
  risk: "low" | "medium" | "high";
  explanation: string;
  evidence: string[];
  violations?: string[];
  raw_analysis?: string;
}

export default function Compliance() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/suppliers`);
      const data = await response.json();

      if (response.ok && data.success) {
        setSuppliers(data.suppliers);
        if (data.suppliers.length > 0) {
          setSelectedSupplier(data.suppliers[0]);
        }
      } else {
        setError("Failed to load suppliers. Please configure data source first.");
      }
    } catch (err) {
      setError("Cannot connect to backend. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!buyerName.trim() || !selectedSupplier) {
      setError("Please enter buyer name and select a supplier");
      return;
    }
    
    setIsQuerying(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/analyze/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyerName,
          supplier_name: selectedSupplier.name
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.result);
        // Update selected supplier score
        setSelectedSupplier(prev => prev ? {
          ...prev,
          score: data.result.score,
          risk: data.result.risk
        } : null);
      } else {
        setError(data.detail || "Analysis failed");
      }
    } catch (err) {
      setError("Failed to connect to API: " + err.message);
    } finally {
      setIsQuerying(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading suppliers...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (suppliers.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">No Data Source Configured</h2>
            <p className="text-muted-foreground mb-6">
              Please go to the Register page to configure your Google Drive or upload local files.
            </p>
            <Button onClick={() => window.location.href = "/register"}>
              Go to Register
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 h-[calc(100vh-2rem)] bg-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">Compliance Check</h1>
            <p className="text-muted-foreground">
              Query your documents to verify supplier compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="ready" />
            <span className="text-sm text-muted-foreground">
              {suppliers.length} suppliers available
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100%-5rem)]">
          {/* Supplier List */}
          <div className="lg:col-span-3 bg-card rounded-xl p-4 overflow-hidden flex flex-col border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search suppliers..."
                className="bg-background border-border h-9"
              />
            </div>
            <div className="flex-1 overflow-auto space-y-2">
              {suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-all",
                    selectedSupplier?.id === supplier.id
                      ? "bg-secondary border border-primary/30"
                      : "bg-muted/50 border border-transparent hover:border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate pr-2 text-foreground">
                      {supplier.name}
                    </span>
                    <StatusBadge status={supplier.status} />
                  </div>
                  {supplier.score > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${supplier.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{supplier.score}%</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Query Panel */}
          <div className="lg:col-span-9 bg-card rounded-xl p-6 flex flex-col overflow-hidden border border-border shadow-sm">
            {/* Selected Supplier Header */}
            {selectedSupplier && (
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedSupplier.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge status={selectedSupplier.status} />
                      {selectedSupplier.score > 0 && (
                        <RiskBadge level={selectedSupplier.risk} />
                      )}
                    </div>
                  </div>
                </div>
                {selectedSupplier.score > 0 && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{selectedSupplier.score}%</div>
                    <div className="text-sm text-muted-foreground">Compliance Score</div>
                  </div>
                )}
              </div>
            )}

            {/* Query Results Area */}
            <div className="flex-1 overflow-auto py-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-4">
                  {error}
                </div>
              )}

              {result ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Score Summary */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">Compliance Score</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{result.score}%</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <span className="text-sm text-muted-foreground">Risk Level</span>
                      </div>
                      <RiskBadge level={result.risk} />
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">Evidence Found</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{result.evidence.length}</div>
                    </div>
                  </div>

                  {/* Full Analysis */}
                  <div className="p-5 rounded-lg bg-secondary/50 border border-primary/20">
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-foreground">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Full Analysis Report
                    </h3>
                    <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                      {result.explanation}
                    </pre>
                  </div>

                  {/* Violations */}
                  {result.violations && result.violations.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 text-foreground">Policy Violations</h3>
                      <div className="space-y-2">
                        {result.violations.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-800">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  <div>
                    <h3 className="font-medium mb-3 text-foreground">Supporting Evidence</h3>
                    <div className="space-y-2">
                      {result.evidence.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">Run Compliance Analysis</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter the buyer name and click Query to analyze the transaction against your compliance policies.
                  </p>
                </div>
              )}
            </div>

            {/* Query Input */}
            <div className="pt-4 border-t border-border">
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <Input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter buyer company name..."
                    className="h-12 bg-background border-border"
                    onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                  />
                </div>
                <Button 
                  onClick={handleQuery}
                  disabled={!buyerName.trim() || isQuerying}
                  className="h-12 px-6"
                >
                  {isQuerying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Query
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Buyer: <span className="font-mono">{buyerName || "(not set)"}</span> • 
                Supplier: <span className="font-mono">{selectedSupplier?.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}