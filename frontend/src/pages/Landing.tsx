import { Link } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  FileText,
  Globe,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Radio,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroGlobe from "@/assets/hero-globe-light.jpg";
import logo from "@/assets/sentinelChain.png";

const features = [
  {
    icon: ShieldCheck,
    title: "Supplier Legitimacy Verification",
    description:
      "AI-powered verification of supplier credentials, certifications, and business history.",
  },
  {
    icon: FileText,
    title: "Contract & Compliance Analysis",
    description:
      "Automated document parsing and compliance checking against your policies.",
  },
  {
    icon: Globe,
    title: "Geopolitical Risk Detection",
    description:
      "Real-time monitoring of global events affecting your supply chain.",
  },
  {
    icon: AlertTriangle,
    title: "Reputational Threat Alerts",
    description:
      "Early warning system for supplier scandals, fraud, and fake news.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="SentinelChain Logo"
              className="w-9 h-9 object-contain"
            />
            <span className="text-xl font-semibold text-foreground">
              SentinelChain
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroGlobe}
            alt="Global supply chain network"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-primary/20 text-sm text-primary mb-6">
              <Radio className="w-3.5 h-3.5" />
              Real-time threat intelligence
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-foreground">
              AI-Powered Supply Chain{" "}
              <span className="text-gradient-primary">
                Compliance & Threat Intelligence
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Verify supplier legitimacy, analyze compliance documents, and
              monitor geopolitical risks in real-time. Protect your supply chain
              before threats materialize.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button size="lg" className="h-12 px-6">
                  <Building2 className="mr-2 w-5 h-5" />
                  Register Your Company
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 bg-card/80 hover:bg-card"
                >
                  View Demo Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Comprehensive Supply Chain Protection
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From supplier verification to real-time threat detection, we
              provide end-to-end visibility into your supply chain risks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-xl bg-background border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-lg bg-accent border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-secondary transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-secondary via-accent/50 to-secondary border border-border">
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative p-12 md:p-16">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  Start Protecting Your Supply Chain Today
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Join 500+ enterprises using SentinelChain to verify suppliers,
                  ensure compliance, and monitor threats in real-time.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/register">
                    <Button size="lg" className="h-12 px-6">
                      <Building2 className="mr-2 w-5 h-5" />
                      Register Now
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    No credit card required
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="SentinelChain Logo"
              className="w-5 h-5 object-contain"
            />
            <span className="font-medium text-foreground">SentinelChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 SentinelChain. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
