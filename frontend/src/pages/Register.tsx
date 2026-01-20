import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle2,
  Building2,
  Shield,
  Key,
  Loader2,
  ChevronRight,
  Database,
  HardDrive,
  Cloud,
  FileSpreadsheet
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COMPLIANCE_API = "http://localhost:8001";
const THREAT_API = "http://localhost:8081";
const REPUTATION_API = "http://localhost:8083";

// Demo defaults
const DEMO_COMPANY_NAME = "Zentivo Coorp";
const DEMO_INDUSTRY = "Retail";
const DEMO_COUNTRY = "India";
const DEMO_EMAIL = "compliance@zentivocoorp.com";
const DEMO_COMPANY_FOLDER_ID = "1XF3Ore12NE2NYR078zIa5rJ1j3hZt51d";
const DEMO_THREAT_FOLDER_ID = "19voCC205C61k_zxWv0QQD3iBNhzY_Yzx";

const industries = [
  "Manufacturing", "Technology", "Healthcare", "Retail",
  "Financial Services", "Energy", "Transportation", "Agriculture",
  "Construction", "Telecommunications",
];

const countries = [
  "United States", "United Kingdom", "Germany", "France",
  "Japan", "China", "India", "Brazil", "Australia", "Canada",
];

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitStatus, setSubmitStatus] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Step 2: Google Drive (Primary)
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [companyFolderId, setCompanyFolderId] = useState("");
  const [threatFolderId, setThreatFolderId] = useState("");

  // Step 3: Add Supplier Data (CSV)
  const [supplierCsv, setSupplierCsv] = useState<File | null>(null);

  const handleUseDemoData = () => {
    // Buyer company demo details
    setCompanyName(DEMO_COMPANY_NAME);
    setIndustry(DEMO_INDUSTRY);
    setCountry(DEMO_COUNTRY);
    setContactEmail(DEMO_EMAIL);

    // Google Drive demo folder IDs (use the same values as shown in placeholders)
    setCompanyFolderId(DEMO_COMPANY_FOLDER_ID);
    setThreatFolderId(DEMO_THREAT_FOLDER_ID);
  };

  const canProceedStep1 = companyName && industry && country && contactEmail;
  const canProceedStep2 = credentialsFile && companyFolderId && threatFolderId;
  const canProceedStep3 = supplierCsv !== null;

  const handleStep1Next = () => {
    if (canProceedStep1) setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (canProceedStep2) setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!canProceedStep3) return;

    setIsSubmitting(true);
    setSubmitProgress(5);
    setSubmitStatus("Registration in progress...");

    try {
      // 1. Configure Compliance Engine
      setSubmitStatus("Configuring Compliance Engine...");
      const complianceForm = new FormData();
      complianceForm.append("credentials", credentialsFile!);
      complianceForm.append("company_folder_id", companyFolderId);
      complianceForm.append("threat_folder_id", threatFolderId);

      const resCompliance = await fetch(`${COMPLIANCE_API}/api/config/google-drive`, {
        method: "POST",
        body: complianceForm,
      });
      if (!resCompliance.ok) throw new Error("Failed to configure Compliance Engine");
      setSubmitProgress(20);

      // 2. Configure Threat Monitor
      setSubmitStatus("Configuring Threat Monitor...");
      const threatForm = new FormData();
      threatForm.append("credentials", credentialsFile!);
      threatForm.append("threat_folder_id", threatFolderId);

      const resThreat = await fetch(`${THREAT_API}/api/config/google-drive`, {
        method: "POST",
        body: threatForm,
      });
      if (!resThreat.ok) throw new Error("Failed to configure Threat Monitor");
      setSubmitProgress(40);

      // 3. Configure Reputation Monitoring
      setSubmitStatus("Configuring Reputation Monitoring...");
      const reputationForm = new FormData();
      reputationForm.append("credentials", credentialsFile!);
      reputationForm.append("reputation_folder_id", threatFolderId); // Using same policy folder

      const resReputation = await fetch(`${REPUTATION_API}/api/config/google-drive`, {
        method: "POST",
        body: reputationForm,
      });
      if (!resReputation.ok) throw new Error("Failed to configure Reputation Monitoring");
      setSubmitProgress(60);

      // 4. Upload Supplier Data CSV (Master file)
      setSubmitStatus("Uploading Master Supply Chain data...");
      const csvForm = new FormData();
      csvForm.append("file", supplierCsv!);

      const resCsv = await fetch(`${THREAT_API}/api/config/supplier-data`, {
        method: "POST",
        body: csvForm,
      });
      if (!resCsv.ok) throw new Error("Failed to upload supplier data");
      setSubmitProgress(80);

      // 5. Poll Compliance Engine for initialization (it's the most complex)
      setSubmitStatus("Finalizing setup and indexing...");
      let attempts = 0;
      const maxAttempts = 15;
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`${COMPLIANCE_API}/api/config/status`);
        const status = await statusRes.json();

        const currentProgress = 80 + (status.indexing_progress || 0) * 0.2;
        setSubmitProgress(currentProgress);
        setSubmitStatus(`Indexing documents... ${status.indexing_progress || 0}%`);

        if (status.initialized) break;
        attempts++;
      }

      setSubmitProgress(100);
      setSubmitStatus("✓ All systems configured successfully!");

      // Save info
      localStorage.setItem("buyer_company_name", companyName);
      localStorage.setItem("buyer_company_info", JSON.stringify({
        name: companyName,
        industry,
        country,
        email: contactEmail
      }));

      setRegistrationComplete(true);
    } catch (error: any) {
      setSubmitStatus(`Error: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">Register Your Company</h1>
            <p className="text-muted-foreground">
              Set up your monitoring and intelligence systems in 3 steps
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseDemoData}
            className="self-start"
          >
            Add demo data
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { num: 1, title: "Company Info", icon: Building2 },
                { num: 2, title: "Google Drive Setup", icon: Cloud },
                { num: 3, title: "Add Supplier Data", icon: FileSpreadsheet },
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                        currentStep >= step.num
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {currentStep > step.num ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-sm font-medium mt-2 text-foreground text-center">
                      {step.title}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-4 transition-all",
                        currentStep > step.num ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Company Information</h2>
                  <p className="text-sm text-muted-foreground">Tell us about your organization</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    placeholder="e.g., Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="compliance@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <Button
                onClick={handleStep1Next}
                disabled={!canProceedStep1}
                className="w-full h-12"
              >
                Continue to Google Drive Setup
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Google Drive Setup */}
          {currentStep === 2 && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Google Drive Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect your Google Drive folders for monitoring and compliance
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="credentials">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Service Account Credentials (JSON) *
                    </div>
                  </Label>
                  <Input
                    id="credentials"
                    type="file"
                    accept=".json"
                    onChange={(e) => setCredentialsFile(e.target.files?.[0] || null)}
                    className="bg-background border-border"
                  />
                  {credentialsFile && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {credentialsFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-folder">Company Documents Folder ID *</Label>
                  <Input
                    id="company-folder"
                    placeholder="e.g., 1XF3Ore12NE2NYR078zIa5rJ1j3hZt51d"
                    value={companyFolderId}
                    onChange={(e) => setCompanyFolderId(e.target.value)}
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threat-folder">Compliance & Threat Policies Folder ID *</Label>
                  <Input
                    id="threat-folder"
                    placeholder="e.g., 19voCC205C61k_zxWv0QQD3iBNhzY_Yzx"
                    value={threatFolderId}
                    onChange={(e) => setThreatFolderId(e.target.value)}
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={!canProceedStep2}
                  className="flex-1 h-12"
                >
                  Continue to Supplier Data
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Add Supplier Data */}
          {currentStep === 3 && !registrationComplete && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Add Supplier Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload your master supply chain CSV file for real-time monitoring
                  </p>
                </div>
              </div>

              <div className="p-6 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <div className="text-center space-y-4">
                  <Database className="w-12 h-12 text-primary mx-auto opacity-70" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Master Supply Chain CSV *</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Should include columns like record_id, supplier_firm, source_country, etc.
                      For the bundled demo, use the CSV from the simulate_data_stream folder
                      (e.g. master_supply_chain.csv).
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <Input
                      id="supplier-csv"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setSupplierCsv(e.target.files?.[0] || null)}
                      className="bg-background"
                    />
                  </div>
                  {supplierCsv && (
                    <p className="text-xs text-green-600 font-medium animate-in fade-in slide-in-from-bottom-1">
                      ✓ {supplierCsv.name} ({(supplierCsv.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  disabled={isSubmitting}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || !canProceedStep3}
                  className="flex-1 h-12 bg-primary hover:opacity-90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Initializing Systems...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 w-5 h-5" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </div>

              {isSubmitting && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{submitStatus}</span>
                    <span className="text-sm text-muted-foreground">{Math.round(submitProgress)}%</span>
                  </div>
                  <Progress value={submitProgress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Registration Complete */}
          {registrationComplete && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm text-center space-y-6 animate-fade-in border-green-500/30">
              <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Registration Complete! 🎉</h2>
                <p className="text-muted-foreground">
                  Your supply chain intelligence ecosystem is now live and monitoring.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-left">
                <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Connected Systems:
                </h3>
                <ul className="text-sm text-green-800 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <strong>Compliance Engine:</strong> Ready for document analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <strong>Threat Monitor:</strong> Real-time geopolitical alerts active
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <strong>Reputation Monitor:</strong> Supplier risk scoring active
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <strong>Data Stream:</strong> Master CSV loaded and streaming
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/dashboard"}
                  className="flex-1 h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.href = "/threats"}
                  className="flex-1 h-12"
                >
                  View Threat Feed
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
