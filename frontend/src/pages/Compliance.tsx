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
  Loader2,
  User,
  ArrowRight
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
  const [buyerCompany, setBuyerCompany] = useState(""); // Fixed buyer from registration
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch suppliers and buyer info on mount
  useEffect(() => {
    fetchSuppliers();
    loadBuyerInfo();
  }, []);

  const loadBuyerInfo = () => {
    // Try to get buyer company name from localStorage (set during registration)
    const storedBuyer = localStorage.getItem("buyer_company_name");
    if (storedBuyer) {
      setBuyerCompany(storedBuyer);
    }
  };

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
    if (!buyerCompany.trim()) {
      setError("Buyer company not set. Please complete registration first.");
      return;
    }

    if (!selectedSupplier) {
      setError("Please select a supplier");
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
          buyer_name: buyerCompany,
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

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (!buyerCompany) {
    return (
      <DashboardLayout>
        <div className="p-8 h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <User className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Buyer Company Not Set</h2>
            <p className="text-muted-foreground mb-6">
              Please complete the registration process to set your buyer company information.
            </p>
            <Button onClick={() => window.location.href = "/register"}>
              Go to Register
            </Button>
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
            <h2 className="text-2xl font-bold mb-2 text-foreground">No Suppliers Found</h2>
            <p className="text-muted-foreground mb-6">
              No supplier documents found in your configured data source. Please upload supplier documents.
            </p>
            <Button onClick={() => window.location.href = "/register"}>
              Configure Data Source
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 h-[calc(100vh-2rem)] bg-background">
        {/* Header with Fixed Buyer Info */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">Compliance Analysis</h1>
            <p className="text-muted-foreground">
              Analyze supplier compliance for transactions
            </p>
          </div>
          
          {/* Fixed Buyer Company Badge */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Buyer Company</p>
                  <p className="font-semibold text-sm text-foreground">{buyerCompany}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="ready" />
              <span className="text-sm text-muted-foreground">
                {suppliers.length} suppliers available
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100%-5rem)]">
          {/* Supplier List */}
          <div className="lg:col-span-3 bg-card rounded-xl p-4 overflow-hidden flex flex-col border border-border shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Select Supplier
              </h3>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background border-border h-9"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto space-y-2">
              {filteredSuppliers.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No suppliers match your search
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setResult(null); // Clear previous analysis
                      setError(""); // Clear any errors
                    }}
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
                ))
              )}
            </div>
          </div>

          {/* Main Query Panel */}
          <div className="lg:col-span-9 bg-card rounded-xl p-6 flex flex-col overflow-hidden border border-border shadow-sm">
            {/* Transaction Header */}
            {selectedSupplier && (
              <div className="pb-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Transaction Analysis</h2>
                  {selectedSupplier.score > 0 && (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-foreground">{selectedSupplier.score}%</div>
                      <div className="text-sm text-muted-foreground">Compliance Score</div>
                    </div>
                  )}
                </div>

                {/* Transaction Flow Visualization */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Buyer</p>
                      <p className="font-medium text-sm text-foreground">{buyerCompany}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Supplier</p>
                      <p className="font-medium text-sm text-foreground">{selectedSupplier.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={selectedSupplier.status} />
                    {selectedSupplier.score > 0 && (
                      <RiskBadge level={selectedSupplier.risk} />
                    )}
                  </div>
                </div>
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
                  <p className="text-muted-foreground max-w-md mb-4">
                    Click "Analyze Transaction" to check compliance between <strong>{buyerCompany}</strong> and <strong>{selectedSupplier?.name}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will analyze contracts, policies, and identify any compliance risks
                  </p>
                </div>
              )}
            </div>

            {/* Query Action */}
            <div className="pt-4 border-t border-border">
              <Button 
                onClick={handleQuery}
                disabled={!selectedSupplier || isQuerying}
                className="w-full h-12"
                size="lg"
              >
                {isQuerying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Analyzing Transaction...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Analyze Transaction: {buyerCompany} ↔ {selectedSupplier?.name}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                Analysis will check policy compliance, sanctions screening, and fraud indicators
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}