import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/ui/status-badge";
import { 
  Send, 
  Globe,
  Zap,
  AlertTriangle,
  Newspaper,
  Radio,
  Bot,
  User,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  threatData?: {
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    affectedSupplier?: string;
    country?: string;
  };
}

interface LiveFeedItem {
  id: string;
  type: "geopolitical" | "operational" | "reputational" | "fake_news";
  title: string;
  severity: "low" | "medium" | "high";
  time: string;
  source: string;
}

const quickActions = [
  { icon: Globe, label: "Geopolitical Risk", query: "What are the current geopolitical risks affecting my suppliers?" },
  { icon: Zap, label: "Operational Disruption", query: "Are there any operational disruptions in my supply chain?" },
  { icon: AlertTriangle, label: "Reputational Threats", query: "Check for any reputational threats to my suppliers" },
  { icon: Newspaper, label: "Fake News Detection", query: "Detect any fake news or misinformation about my suppliers" },
];

const liveFeed: LiveFeedItem[] = [
  { id: "1", type: "geopolitical", title: "Trade restrictions announced for semiconductor exports", severity: "high", time: "2m ago", source: "Reuters" },
  { id: "2", type: "operational", title: "Port congestion reported in Singapore", severity: "medium", time: "15m ago", source: "Bloomberg" },
  { id: "3", type: "reputational", title: "Labor dispute at Nordic Supply Co.", severity: "medium", time: "1h ago", source: "Local News" },
  { id: "4", type: "fake_news", title: "False report debunked: Global Tech acquisition", severity: "low", time: "2h ago", source: "Fact Check" },
  { id: "5", type: "geopolitical", title: "New tariffs proposed for electronics imports", severity: "medium", time: "3h ago", source: "WSJ" },
];

export default function Threats() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI threat intelligence assistant. I monitor real-time geopolitical events, operational disruptions, and reputational risks affecting your supply chain. How can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (message?: string) => {
    const text = message || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const responses: Record<string, Message> = {
        "geopolitical": {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Based on current monitoring, I've identified 3 active geopolitical risks:\n\n1. **Taiwan Strait tensions** are affecting Meridian Electronics' shipping routes, causing 15-20% delays.\n\n2. **EU-China trade discussions** may impact component pricing from Shanghai Logistics.\n\n3. **Eastern European supply corridors** are experiencing heightened scrutiny due to ongoing regional tensions.\n\nRecommendation: Consider activating backup suppliers in Japan and South Korea for critical components.",
          timestamp: new Date(),
          threatData: {
            category: "Geopolitical",
            severity: "high",
            affectedSupplier: "Meridian Electronics",
            country: "Taiwan",
          },
        },
        "operational": {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Current operational disruptions detected:\n\n1. **Port of Singapore** - Moderate congestion (2-3 day delays)\n\n2. **Suez Canal** - Normal operations restored\n\n3. **Weather alert** - Typhoon warning in East China Sea may affect shipments next week\n\nAll your tier-1 suppliers have confirmed contingency plans are active.",
          timestamp: new Date(),
          threatData: {
            category: "Operational",
            severity: "medium",
            country: "Singapore",
          },
        },
        "reputational": {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Reputational monitoring report:\n\n⚠️ **Nordic Supply Co.** - Media coverage of labor dispute. Sentiment score dropped 23% this week. Recommend reaching out to supplier for clarification.\n\n✅ **Global Tech Solutions** - Positive press coverage for sustainability initiatives.\n\n✅ **Pacific Components** - No significant media mentions.",
          timestamp: new Date(),
          threatData: {
            category: "Reputational",
            severity: "medium",
            affectedSupplier: "Nordic Supply Co.",
          },
        },
        "fake_news": {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Misinformation analysis complete:\n\n❌ **Debunked**: Report claiming Global Tech Solutions acquisition by competitor - no SEC filings support this claim.\n\n⚠️ **Monitoring**: Social media rumors about Pacific Components quality issues - appears to be competitor disinformation.\n\nOur AI has flagged 12 potentially misleading articles this week. All have been cross-referenced with verified sources.",
          timestamp: new Date(),
          threatData: {
            category: "Fake News",
            severity: "low",
            affectedSupplier: "Global Tech Solutions",
          },
        },
      };

      let responseKey = "geopolitical";
      if (text.toLowerCase().includes("operational") || text.toLowerCase().includes("disruption")) {
        responseKey = "operational";
      } else if (text.toLowerCase().includes("reputational") || text.toLowerCase().includes("reputation")) {
        responseKey = "reputational";
      } else if (text.toLowerCase().includes("fake") || text.toLowerCase().includes("misinformation")) {
        responseKey = "fake_news";
      }

      setMessages(prev => [...prev, responses[responseKey]]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="p-8 h-[calc(100vh-2rem)] bg-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">Threat Intelligence</h1>
            <p className="text-muted-foreground">
              Real-time monitoring and AI-powered risk analysis
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/20 text-primary text-sm">
            <span className="w-2 h-2 rounded-full bg-success pulse-live" />
            Live monitoring active
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100%-5rem)]">
          {/* Chat Interface */}
          <div className="lg:col-span-8 bg-card rounded-xl flex flex-col overflow-hidden border border-border shadow-sm">
            {/* Quick Actions */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(action.query)}
                    className="bg-background border-border hover:border-primary/30 hover:bg-muted"
                  >
                    <action.icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    message.role === "assistant"
                      ? "bg-accent border border-primary/20"
                      : "bg-primary"
                  )}>
                    {message.role === "assistant" ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] space-y-2",
                    message.role === "user" && "text-right"
                  )}>
                    <div className={cn(
                      "inline-block p-4 rounded-xl",
                      message.role === "assistant"
                        ? "bg-muted/50 border border-border"
                        : "bg-primary text-primary-foreground"
                    )}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-left">
                        {message.content}
                      </p>
                    </div>
                    {message.threatData && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RiskBadge level={message.threatData.severity} />
                        <span>•</span>
                        <span>{message.threatData.category}</span>
                        {message.threatData.affectedSupplier && (
                          <>
                            <span>•</span>
                            <span>{message.threatData.affectedSupplier}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about supply chain threats..."
                  className="h-12 bg-background border-border"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="h-12 px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Live Feed */}
          <div className="lg:col-span-4 bg-card rounded-xl p-4 flex flex-col overflow-hidden border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Live Feed</h2>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto space-y-3">
              {liveFeed.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      item.severity === "high" && "bg-risk-high/10 border border-risk-high/30",
                      item.severity === "medium" && "bg-risk-medium/10 border border-risk-medium/30",
                      item.severity === "low" && "bg-risk-low/10 border border-risk-low/30",
                    )}>
                      {item.type === "geopolitical" && <Globe className={cn("w-4 h-4", item.severity === "high" ? "text-risk-high" : item.severity === "medium" ? "text-risk-medium" : "text-risk-low")} />}
                      {item.type === "operational" && <Zap className={cn("w-4 h-4", item.severity === "high" ? "text-risk-high" : item.severity === "medium" ? "text-risk-medium" : "text-risk-low")} />}
                      {item.type === "reputational" && <AlertTriangle className={cn("w-4 h-4", item.severity === "high" ? "text-risk-high" : item.severity === "medium" ? "text-risk-medium" : "text-risk-low")} />}
                      {item.type === "fake_news" && <Newspaper className={cn("w-4 h-4", item.severity === "high" ? "text-risk-high" : item.severity === "medium" ? "text-risk-medium" : "text-risk-low")} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1 line-clamp-2 text-foreground">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.source}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
