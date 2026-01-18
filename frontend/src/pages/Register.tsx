import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  CheckCircle2,
  Key,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

export default function Register() {
  const [configMethod, setConfigMethod] = useState<"gdrive" | "local" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Google Drive state
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [companyFolderId, setCompanyFolderId] = useState("");
  const [threatFolderId, setThreatFolderId] = useState("");

  // Local upload state
  const [localFiles, setLocalFiles] = useState<File[]>([]);

  const handleGoogleDriveSubmit = async () => {
    if (!credentialsFile || !companyFolderId || !threatFolderId) {
      setUploadStatus("Please fill all fields");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Connecting to Google Drive...");

    try {
      const formData = new FormData();
      formData.append("credentials", credentialsFile);
      formData.append("company_folder_id", companyFolderId);
      formData.append("threat_folder_id", threatFolderId);

      const response = await fetch(`${API_BASE}/api/config/google-drive`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus("✓ Google Drive connected successfully!");
        setUploadSuccess(true);
      } else {
        setUploadStatus(`Error: ${data.detail || "Failed to connect"}`);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalUpload = async () => {
    if (localFiles.length === 0) {
      setUploadStatus("Please select files to upload");
      return;
    }

    setIsUploading(true);
    setUploadStatus(`Uploading ${localFiles.length} files...`);

    try {
      const formData = new FormData();
      localFiles.forEach(file => formData.append("files", file));
      formData.append("document_type", "company");

      const response = await fetch(`${API_BASE}/api/config/local-upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(`✓ Uploaded ${data.files.length} files successfully!`);
        setUploadSuccess(true);
      } else {
        setUploadStatus(`Error: ${data.detail || "Upload failed"}`);
      }
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLocalFiles(Array.from(e.target.files));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-background min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Configure Data Source</h1>
          <p className="text-muted-foreground">
            Choose how to connect your compliance documents
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Method Selection */}
          {!configMethod && (
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setConfigMethod("gdrive")}
                className="p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-accent/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-secondary">
                  <Key className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Google Drive</h3>
                <p className="text-sm text-muted-foreground">
                  Connect using service account credentials and folder IDs
                </p>
              </button>

              <button
                onClick={() => setConfigMethod("local")}
                className="p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-accent/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-secondary">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Local Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Upload documents directly from your computer
                </p>
              </button>
            </div>
          )}

          {/* Google Drive Configuration */}
          {configMethod === "gdrive" && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Google Drive Setup</h2>
                <Button variant="ghost" size="sm" onClick={() => setConfigMethod(null)}>
                  Change Method
                </Button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="credentials">Service Account Credentials (JSON)</Label>
                  <div className="relative">
                    <Input
                      id="credentials"
                      type="file"
                      accept=".json"
                      onChange={(e) => setCredentialsFile(e.target.files?.[0] || null)}
                      className="bg-background border-border"
                    />
                  </div>
                  {credentialsFile && (
                    <p className="text-xs text-muted-foreground">
                      ✓ {credentialsFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-folder">Company Documents Folder ID</Label>
                  <Input
                    id="company-folder"
                    placeholder="e.g., 1XF3Ore12NE2NYR078zIa5rJ1j3hZt51d"
                    value={companyFolderId}
                    onChange={(e) => setCompanyFolderId(e.target.value)}
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threat-folder">Threat Policies Folder ID</Label>
                  <Input
                    id="threat-folder"
                    placeholder="e.g., 19voCC205C61k_zxWv0QQD3iBNhzY_Yzx"
                    value={threatFolderId}
                    onChange={(e) => setThreatFolderId(e.target.value)}
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleGoogleDriveSubmit}
                  disabled={isUploading || !credentialsFile || !companyFolderId || !threatFolderId}
                  className="w-full h-12"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 w-5 h-5" />
                      Connect Google Drive
                    </>
                  )}
                </Button>

                {uploadStatus && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    uploadSuccess 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-muted border-border text-foreground"
                  )}>
                    {uploadStatus}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      You can now go to the Compliance page to analyze transactions
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/compliance"}>
                      Go to Compliance
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Local Upload Configuration */}
          {configMethod === "local" && (
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Local File Upload</h2>
                <Button variant="ghost" size="sm" onClick={() => setConfigMethod(null)}>
                  Change Method
                </Button>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="font-medium mb-2 text-foreground">Select Company Documents</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, DOCX, TXT files supported
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.json"
                    onChange={handleFileSelect}
                    className="max-w-xs mx-auto"
                  />
                </div>

                {localFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({localFiles.length})</Label>
                    <div className="max-h-40 overflow-auto space-y-1">
                      {localFiles.map((file, idx) => (
                        <div key={idx} className="text-sm p-2 rounded bg-muted text-foreground">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleLocalUpload}
                  disabled={isUploading || localFiles.length === 0}
                  className="w-full h-12"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 w-5 h-5" />
                      Upload Files
                    </>
                  )}
                </Button>

                {uploadStatus && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    uploadSuccess 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-muted border-border text-foreground"
                  )}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}