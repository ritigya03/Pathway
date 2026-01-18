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
  Cloud
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

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

  // Step 3: Optional Local Upload
  const [useLocalUpload, setUseLocalUpload] = useState(false);
  const [localCompanyDocs, setLocalCompanyDocs] = useState<File[]>([]);
  const [localPolicyDocs, setLocalPolicyDocs] = useState<File[]>([]);

  const canProceedStep1 = companyName && industry && country && contactEmail;
  const canProceedStep2 = credentialsFile && companyFolderId && threatFolderId;

  const handleStep1Next = () => {
    if (canProceedStep1) setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (canProceedStep2) setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitProgress(10);
    setSubmitStatus("Registering your company...");

    try {
      // Main: Upload Google Drive credentials
      setSubmitStatus("Connecting to Google Drive...");
      setSubmitProgress(30);

      const formData = new FormData();
      formData.append("credentials", credentialsFile!);
      formData.append("company_folder_id", companyFolderId);
      formData.append("threat_folder_id", threatFolderId);

      const response = await fetch(`${API_BASE}/api/config/google-drive`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to connect Google Drive");
      }

      setSubmitProgress(60);
      setSubmitStatus("Google Drive connected! Indexing documents...");

      // Poll for indexing completion
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await fetch(`${API_BASE}/api/config/status`);
        const status = await statusRes.json();

        setSubmitProgress(60 + (status.indexing_progress || 0) * 0.3);
        setSubmitStatus(`Indexing documents... ${status.indexing_progress || 0}%`);

        if (status.initialized) {
          break;
        }

        attempts++;
      }

      // Optional: Upload local files if provided
      if (useLocalUpload && (localCompanyDocs.length > 0 || localPolicyDocs.length > 0)) {
        setSubmitProgress(90);
        setSubmitStatus("Uploading additional local files...");

        if (localCompanyDocs.length > 0) {
          const companyFormData = new FormData();
          localCompanyDocs.forEach(file => companyFormData.append("files", file));
          companyFormData.append("document_type", "company");

          await fetch(`${API_BASE}/api/config/local-upload`, {
            method: "POST",
            body: companyFormData,
          });
        }

        if (localPolicyDocs.length > 0) {
          const policyFormData = new FormData();
          localPolicyDocs.forEach(file => policyFormData.append("files", file));
          policyFormData.append("document_type", "policy");

          await fetch(`${API_BASE}/api/config/local-upload`, {
            method: "POST",
            body: policyFormData,
          });
        }
      }

      setSubmitProgress(100);
      setSubmitStatus("✓ Registration complete!");
      
      // Save buyer company name to localStorage for Compliance page
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
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Register Your Company</h1>
          <p className="text-muted-foreground">
            Set up your compliance monitoring system in 3 easy steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { num: 1, title: "Company Info", icon: Building2 },
                { num: 2, title: "Google Drive Setup", icon: Cloud },
                { num: 3, title: "Optional Uploads", icon: HardDrive },
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
                    <span className="text-sm font-medium mt-2 text-foreground">
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

          {/* Step 2: Google Drive Setup (PRIMARY) */}
          {currentStep === 2 && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Google Drive Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect your Google Drive folders containing company docs and compliance policies
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📁 Required Google Drive Folders:</h3>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li><strong>Company Documents Folder:</strong> Supplier company profiles, contracts, financial docs</li>
                  <li><strong>Threat Policies Folder:</strong> Compliance policies (e.g., compliance_policy.jsonl)</li>
                </ul>
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
                  <p className="text-xs text-muted-foreground">
                    Upload your Google service account JSON credentials file
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    The Google Drive folder containing supplier/buyer company documents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threat-folder">Threat Policies Folder ID *</Label>
                  <Input
                    id="threat-folder"
                    placeholder="e.g., 19voCC205C61k_zxWv0QQD3iBNhzY_Yzx"
                    value={threatFolderId}
                    onChange={(e) => setThreatFolderId(e.target.value)}
                    className="bg-background border-border font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The Google Drive folder containing compliance_policy.jsonl and other policies
                  </p>
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
                  Continue to Optional Uploads
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Optional Local Upload */}
          {currentStep === 3 && !registrationComplete && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Additional Documents (Optional)</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload extra files not in Google Drive - skip if everything is already there
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Upload additional local files?</p>
                  <p className="text-xs text-muted-foreground">Only if you have extra documents not in Google Drive</p>
                </div>
                <Button
                  variant={useLocalUpload ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseLocalUpload(!useLocalUpload)}
                >
                  {useLocalUpload ? "Enabled" : "Skip"}
                </Button>
              </div>

              {useLocalUpload && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-xl p-6">
                    <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-sm font-medium text-center mb-2 text-foreground">
                      Company Documents
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.json"
                      onChange={(e) => e.target.files && setLocalCompanyDocs(Array.from(e.target.files))}
                      className="max-w-xs mx-auto"
                    />
                    {localCompanyDocs.length > 0 && (
                      <p className="text-xs text-green-600 text-center mt-2">
                        ✓ {localCompanyDocs.length} files selected
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-border rounded-xl p-6">
                    <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-sm font-medium text-center mb-2 text-foreground">
                      Policy Documents
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.json,.jsonl"
                      onChange={(e) => e.target.files && setLocalPolicyDocs(Array.from(e.target.files))}
                      className="max-w-xs mx-auto"
                    />
                    {localPolicyDocs.length > 0 && (
                      <p className="text-xs text-green-600 text-center mt-2">
                        ✓ {localPolicyDocs.length} files selected
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Setting up...
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
                    <span className="text-sm text-foreground">{submitStatus}</span>
                    <span className="text-sm text-muted-foreground">{submitProgress}%</span>
                  </div>
                  <Progress value={submitProgress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Registration Complete */}
          {registrationComplete && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Registration Complete! 🎉</h2>
                <p className="text-muted-foreground">
                  Your compliance monitoring system is now set up and ready to use
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <h3 className="text-sm font-semibold text-green-900 mb-2">✓ Setup Summary:</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Company: <strong>{companyName}</strong></li>
                  <li>• Industry: <strong>{industry}</strong></li>
                  <li>• Google Drive connected and indexed</li>
                  <li>• Compliance policies loaded</li>
                  {useLocalUpload && (localCompanyDocs.length > 0 || localPolicyDocs.length > 0) && (
                    <li>• Additional {localCompanyDocs.length + localPolicyDocs.length} local files uploaded</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="flex-1 h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.href = "/compliance"}
                  className="flex-1 h-12"
                >
                  Start Compliance Analysis
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">💡 Need Help?</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>Where to find Folder ID:</strong> Open your Google Drive folder, look at the URL:
                  <code className="bg-background px-2 py-1 rounded ml-2 text-xs">
                    https://drive.google.com/drive/folders/<strong className="text-primary">FOLDER_ID_HERE</strong>
                  </code>
                </p>
                <p>
                  <strong>Service Account:</strong> Create one in Google Cloud Console → IAM & Admin → Service Accounts
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}