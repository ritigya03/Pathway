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
  Search,
  FileText,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================ Types ============================ */
interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
}

interface ValidatedThreat {
  supplier: string;
  country: string;
  threat_type: string;
  headline: string;
  description: string;
  source: string;
  timestamp?: string;
}

type ThreatMode = "operational" | "reputational";

const API_BASE = "http://localhost:8081";
const RAG_ENDPOINT = `${API_BASE}/proxy-answer`;
const THREATS_ENDPOINT = `${API_BASE}/threats`;
const COUNTRIES_ENDPOINT = `${API_BASE}/countries`;

/* ============================ RESPONSE FORMATTER 🔥 ============================ */
const formatThreatResponse = (content: string) => {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside mb-3 space-y-1 text-gray-600">
          {currentList.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const formatInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    if (!trimmed) {
      flushList();
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      flushList();
      const content = numberedMatch[2];
      elements.push(
        <div key={idx} className="mb-3">
          <div className="flex gap-2">
            <span className="font-semibold text-gray-700 min-w-[24px]">{numberedMatch[1]}.</span>
            <div dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} className="text-gray-600" />
          </div>
        </div>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }

    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)|^\*\*(.+)\*\*$/);
    if (headerMatch) {
      flushList();
      const headerText = headerMatch[1] || headerMatch[2];
      elements.push(
        <div key={idx} className="font-semibold text-base text-gray-800 mb-2 mt-4 uppercase tracking-wide">
          {headerText}
        </div>
      );
      return;
    }

    flushList();
    elements.push(
      <div key={idx} className="mb-2 text-gray-600" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
    );
  });

  flushList();
  return elements;
};

/* ============================ Main Component ============================ */
export default function Threats() {
  const [mode, setMode] = useState<ThreatMode>("operational");
  const [operationalMessages, setOperationalMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your Operational & Geopolitical Threat Intelligence assistant. Click on a country to query threats.",
      timestamp: new Date(),
    },
  ]);

  const [reputationalMessages, setReputationalMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your Reputational Risk Monitor. Click on a country to check supplier reputation.",
      timestamp: new Date(),
    },
  ]);

  const [operationalInput, setOperationalInput] = useState("");
  const [reputationalInput, setReputationalInput] = useState("");
  const [operationalTyping, setOperationalTyping] = useState(false);
  const [reputationalTyping, setReputationalTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Live data
  const [countries, setCountries] = useState<string[]>([]);
  const [liveFeed, setLiveFeed] = useState<ValidatedThreat[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

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

  // Fetch countries on mount and poll
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(COUNTRIES_ENDPOINT);
        const data = await res.json();
        setCountries(data.countries || []);
        setLoadingCountries(false);
      } catch (err) {
        console.error("Error fetching countries:", err);
        setLoadingCountries(false);
      }
    };

    fetchCountries();
    const interval = setInterval(fetchCountries, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch validated threats on mount and poll
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const res = await fetch(THREATS_ENDPOINT);
        const data = await res.json();
        setLiveFeed(data.threats || []);
      } catch (err) {
        console.error("Error fetching threats:", err);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const callRAG = async (query: string): Promise<string> => {
    const res = await fetch(RAG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: query }),
    });
    const data = await res.json();
    return data.answer || data.response || JSON.stringify(data);
  };

  const sendMessage = async (
    text: string,
    setMessages: Function,
    setTyping: Function
  ) => {
    if (!text.trim()) return;

    setMessages((prev: Message[]) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);

    setTyping(true);

    try {
      const answer = await callRAG(text);
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: answer,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "error",
          content: err.message,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleCountryClick = (country: string) => {
    const query = mode === "operational" 
      ? `What are the current operational and geopolitical threats for suppliers in ${country}?`
      : `What are the reputational risks and compliance issues for suppliers in ${country}?`;
    
    if (mode === "operational") {
      sendMessage(query, setOperationalMessages, setOperationalTyping);
    } else {
      sendMessage(query, setReputationalMessages, setReputationalTyping);
    }
  };

  const currentMessages = mode === "operational" ? operationalMessages : reputationalMessages;
  const currentInput = mode === "operational" ? operationalInput : reputationalInput;
  const setCurrentInput = mode === "operational" ? setOperationalInput : setReputationalInput;
  const currentTyping = mode === "operational" ? operationalTyping : reputationalTyping;
  const currentSetMessages = mode === "operational" ? setOperationalMessages : setReputationalMessages;
  const currentSetTyping = mode === "operational" ? setOperationalTyping : setReputationalTyping;
  const currentEndRef = mode === "operational" ? operationalEndRef : reputationalEndRef;

  const filteredCountries = countries.filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityColor = (threatType: string) => {
    const type = threatType.toLowerCase();
    if (type.includes("war") || type.includes("conflict") || type.includes("earthquake")) {
      return "high";
    } else if (type.includes("strike") || type.includes("flood") || type.includes("fire")) {
      return "medium";
    }
    return "low";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Threat Intelligence</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium border border-teal-200">
                Ready for Analysis
              </span>
              <span className="text-gray-500 text-sm">{countries.length} countries monitored</span>
            </div>
          </div>
          <p className="text-gray-500">Monitor operational, geopolitical, and reputational risks</p>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* Left Sidebar - Countries List */}
          <div className="col-span-3 bg-white border-r border-gray-200 h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search countries..."
                  className="pl-10 bg-gray-50 border-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="p-4 border-b border-gray-200">
              <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
                <button
                  onClick={() => setMode("operational")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "operational"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Globe className="h-4 w-4 inline mr-1" />
                  Operational
                </button>
                <button
                  onClick={() => setMode("reputational")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "reputational"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Zap className="h-4 w-4 inline mr-1" />
                  Reputational
                </button>
              </div>
            </div>

            {/* Countries List */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Query for Supplier Countries
              </h3>
            </div>

            <div className="overflow-y-auto h-[calc(100%-240px)]">
              {loadingCountries ? (
                <div className="p-4 text-center text-gray-500">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading countries...
                </div>
              ) : filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleCountryClick(country)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{country}</span>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-200">
                        Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-6 bg-white flex flex-col h-[calc(100vh-140px)]">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {mode === "operational" ? "Operational & Geopolitical Intelligence" : "Reputational Risk Analysis"}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-200">
                    Ready for Analysis
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {currentMessages.map((m: Message) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      m.role === "user" && "flex-row-reverse"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-teal-600" />
                      </div>
                    ) : m.role === "user" ? (
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-4 shadow-sm",
                        m.role === "user"
                          ? "bg-blue-600 text-white"
                          : m.role === "error"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-white text-gray-900 border border-gray-200"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none">
                          {formatThreatResponse(m.content)}
                        </div>
                      ) : (
                        <div className={m.role === "user" ? "text-white" : ""}>{m.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={currentEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(currentInput, currentSetMessages, currentSetTyping)}
                    placeholder="Ask a question..."
                    className="bg-gray-50 border-gray-200 h-12"
                  />
                </div>
                <Button
                  onClick={() => sendMessage(currentInput, currentSetMessages, currentSetTyping)}
                  disabled={currentTyping}
                  className="h-12 px-6 bg-slate-700 hover:bg-slate-800"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Query
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Live Threats Feed */}
          <div className="col-span-3 bg-white border-l border-gray-200 h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-red-500" />
                <h2 className="font-semibold text-gray-900">Live Threats</h2>
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100%-73px)] p-4 space-y-3">
              {liveFeed.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No active threats detected
                </div>
              ) : (
                liveFeed.map((threat, idx) => {
                  const severity = getSeverityColor(threat.threat_type);
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            severity === "high" && "bg-red-100 text-red-700",
                            severity === "medium" && "bg-yellow-100 text-yellow-700",
                            severity === "low" && "bg-green-100 text-green-700"
                          )}
                        >
                          {threat.threat_type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 font-medium mb-2 leading-snug">
                        {threat.headline}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {threat.description.substring(0, 100)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {threat.country} • {threat.supplier}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Source: {threat.source}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}