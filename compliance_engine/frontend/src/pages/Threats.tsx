import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Globe,
  Zap,
  AlertTriangle,
  Radio,
  Bot,
  User,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
}

interface LiveFeedItem {
  id: string;
  type: "geopolitical" | "operational" | "reputational";
  title: string;
  severity: "low" | "medium" | "high";
  time: string;
  source: string;
}

const operationalQueries = [
  "What are the current threats for suppliers in China?",
  "Show me operational risks in Bangladesh",
  "Are there any geopolitical threats affecting Turkey?",
  "What threats are affecting Taiwan suppliers?",
  "Check for supply chain disruptions in Vietnam"
];

const reputationalQueries = [
  "Any reputational threats to China suppliers?",
  "Check labor compliance issues in Bangladesh",
  "Reputational risks for Turkish suppliers",
  "Environmental concerns in Vietnam",
  "Check supplier reputation in India"
];

const liveFeed: LiveFeedItem[] = [
  { id: "1", type: "geopolitical", title: "Trade restrictions announced for semiconductor exports", severity: "high", time: "2m ago", source: "Reuters" },
  { id: "2", type: "operational", title: "Port congestion reported in Singapore", severity: "medium", time: "15m ago", source: "Bloomberg" },
  { id: "3", type: "reputational", title: "Labor dispute at Nordic Supply Co.", severity: "medium", time: "1h ago", source: "Local News" },
  { id: "4", type: "geopolitical", title: "New tariffs proposed for electronics imports", severity: "medium", time: "3h ago", source: "WSJ" },
  { id: "5", type: "operational", title: "Typhoon warning in East China Sea", severity: "high", time: "4h ago", source: "Weather Alert" },
];

const API_ENDPOINT = "http://localhost:8000/v2/answer";

export default function Threats() {
  // Operational/Geopolitical Chat State
  const [operationalMessages, setOperationalMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your Operational & Geopolitical Threat Intelligence assistant. I monitor real-time events, supply chain disruptions, port delays, natural disasters, and political risks affecting your suppliers. Ask me about any country or region.",
      timestamp: new Date(),
    }
  ]);
  
  // Reputational Chat State
  const [reputationalMessages, setReputationalMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your Reputational Risk Monitor. I track labor disputes, environmental violations, compliance issues, and media sentiment around your suppliers. Ask me about supplier reputation in any country.",
      timestamp: new Date(),
    }
  ]);

  const [operationalInput, setOperationalInput] = useState("");
  const [reputationalInput, setReputationalInput] = useState("");
  const [operationalTyping, setOperationalTyping] = useState(false);
  const [reputationalTyping, setReputationalTyping] = useState(false);
  
  const operationalEndRef = useRef<HTMLDivElement>(null);
  const reputationalEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom(operationalEndRef);
  }, [operationalMessages]);

  useEffect(() => {
    scrollToBottom(reputationalEndRef);
  }, [reputationalMessages]);

  const callAPI = async (query: string): Promise<string> => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.answer || data.response || JSON.stringify(data);
    } catch (error) {
      throw new Error(`Failed to connect to API: ${error.message}`);
    }
  };

  const handleOperationalSend = async (message?: string) => {
    const text = message || operationalInput;
    if (!text.trim() || operationalTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setOperationalMessages(prev => [...prev, userMessage]);
    setOperationalInput("");
    setOperationalTyping(true);

    try {
      const answer = await callAPI(text);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };

      setOperationalMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "error",
        content: `Error: ${error.message}. Make sure the backend is running at ${API_ENDPOINT}`,
        timestamp: new Date(),
      };
      setOperationalMessages(prev => [...prev, errorMessage]);
    } finally {
      setOperationalTyping(false);
    }
  };

  const handleReputationalSend = async (message?: string) => {
    const text = message || reputationalInput;
    if (!text.trim() || reputationalTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setReputationalMessages(prev => [...prev, userMessage]);
    setReputationalInput("");
    setReputationalTyping(true);

    try {
      const answer = await callAPI(text);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };

      setReputationalMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "error",
        content: `Error: ${error.message}. Make sure the backend is running at ${API_ENDPOINT}`,
        timestamp: new Date(),
      };
      setReputationalMessages(prev => [...prev, errorMessage]);
    } finally {
      setReputationalTyping(false);
    }
  };

  const ChatInterface = ({ 
    messages, 
    input, 
    setInput, 
    isTyping, 
    handleSend, 
    sampleQueries,
    messagesEndRef,
    title,
    icon: Icon,
    iconColor
  }: {
    messages: Message[];
    input: string;
    setInput: (value: string) => void;
    isTyping: boolean;
    handleSend: (message?: string) => void;
    sampleQueries: string[];
    messagesEndRef: React.RefObject<HTMLDivElement>;
    title: string;
    icon: any;
    iconColor: string;
  }) => (
    <div className="bg-card rounded-xl flex flex-col overflow-hidden border border-border shadow-sm h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconColor)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        
        {/* Sample Queries */}
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((query, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleSend(query)}
              disabled={isTyping}
              className="text-xs bg-background border-border hover:border-primary/30 hover:bg-muted"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {query.length > 35 ? query.substring(0, 35) + "..." : query}
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
                : message.role === "error"
                ? "bg-red-500/10 border border-red-500/30"
                : "bg-primary"
            )}>
              {message.role === "assistant" ? (
                <Bot className="w-4 h-4 text-primary" />
              ) : message.role === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <User className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <div className={cn(
              "max-w-[80%]",
              message.role === "user" && "text-right"
            )}>
              <div className={cn(
                "inline-block p-4 rounded-xl",
                message.role === "assistant"
                  ? "bg-muted/50 border border-border"
                  : message.role === "error"
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-primary text-primary-foreground"
              )}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-left">
                  {message.content}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
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
            placeholder="Ask about threats..."
            className="h-12 bg-background border-border"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isTyping}
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
  );

  return (
    <DashboardLayout>
      <div className="p-8 h-[calc(100vh-2rem)] bg-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">Threat Intelligence</h1>
            <p className="text-muted-foreground">
              Dual AI-powered threat monitoring system
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/20 text-primary text-sm">
            <span className="w-2 h-2 rounded-full bg-success pulse-live" />
            Live monitoring active
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100%-5rem)]">
          {/* Operational/Geopolitical Chat */}
          <div className="lg:col-span-5">
            <ChatInterface
              messages={operationalMessages}
              input={operationalInput}
              setInput={setOperationalInput}
              isTyping={operationalTyping}
              handleSend={handleOperationalSend}
              sampleQueries={operationalQueries}
              messagesEndRef={operationalEndRef}
              title="Operational & Geopolitical Threats"
              icon={Globe}
              iconColor="bg-gradient-to-br from-blue-500 to-purple-600"
            />
          </div>

          {/* Reputational Chat */}
          <div className="lg:col-span-4">
            <ChatInterface
              messages={reputationalMessages}
              input={reputationalInput}
              setInput={setReputationalInput}
              isTyping={reputationalTyping}
              handleSend={handleReputationalSend}
              sampleQueries={reputationalQueries}
              messagesEndRef={reputationalEndRef}
              title="Reputational Risk Monitor"
              icon={AlertTriangle}
              iconColor="bg-gradient-to-br from-orange-500 to-red-600"
            />
          </div>

          {/* Live Feed */}
          <div className="lg:col-span-3 bg-card rounded-xl p-4 flex flex-col overflow-hidden border border-border shadow-sm">
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