import { cn } from "@/lib/utils";

type RiskLevel = "low" | "medium" | "high" | "critical";
type Status = "processing" | "indexed" | "ready" | "error";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const labels: Record<RiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    critical: "Critical",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        level === "low" && "badge-risk-low",
        level === "medium" && "badge-risk-medium",
        level === "high" && "badge-risk-high",
        level === "critical" && "badge-risk-critical",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          level === "low" && "bg-risk-low",
          level === "medium" && "bg-risk-medium",
          level === "high" && "bg-risk-high",
          level === "critical" && "bg-risk-critical"
        )}
      />
      {labels[level]}
    </span>
  );
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<Status, { label: string; styles: string }> = {
    processing: {
      label: "Processing",
      styles: "bg-primary/10 text-primary border border-primary/30",
    },
    indexed: {
      label: "Indexed",
      styles: "bg-accent text-primary border border-primary/30",
    },
    ready: {
      label: "Ready for Analysis",
      styles: "bg-secondary text-primary border border-primary/30",
    },
    error: {
      label: "Error",
      styles: "bg-destructive/10 text-destructive border border-destructive/30",
    },
  };

  const { label, styles } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        styles,
        status === "processing" && "animate-pulse",
        className
      )}
    >
      {label}
    </span>
  );
}
