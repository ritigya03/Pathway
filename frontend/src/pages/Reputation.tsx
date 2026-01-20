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
  Building2,
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
  company: string;
  category: string;
  threat_type: string;
  headline: string;
  description: string;
  source: string;
  timestamp?: string;
}

interface FakeIndustryThreat {
  company: string;
  headline: string;
  timestamp: string;
}

type ThreatMode = "reputational";

const API_BASE = "http://localhost:8083";
const RAG_ENDPOINT = `${API_BASE}/proxy-answer`;
const THREATS_ENDPOINT = `${API_BASE}/threats`;
const FAKE_INDUSTRIES_ENDPOINT = `${API_BASE}/fake-industries`;

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
export default function Reputation() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your Reputational Risk Monitor. I can analyze company reputation and supplier risks.",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  
  // Live data
  const [liveFeed, setLiveFeed] = useState<ValidatedThreat[]>([]);
  const [fakeIndustries, setFakeIndustries] = useState<FakeIndustryThreat[]>([]);
  
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    
    const fetchFakeIndustries = async () => {
      try {
        const res = await fetch(FAKE_INDUSTRIES_ENDPOINT);
        const data = await res.json();
        setFakeIndustries(data.fake_industries || []);
      } catch (err) {
        console.error("Error fetching fake industries:", err);
      }
    };

    fetchThreats();
    fetchFakeIndustries();
    const interval = setInterval(() => {
        fetchThreats();
        fetchFakeIndustries();
    }, 5000); // Poll every 5s
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

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date(),
      },
    ]);

    setTyping(true);
    const currentInput = input;
    setInput("");

    try {
      const answer = await callRAG(currentInput);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: answer,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
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

  const getSeverityColor = (category: string) => {
    const type = category.toLowerCase();
    if (type === "fake") return "high";
    if (type === "restricted") return "medium";
    return "low";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Reputational Monitoring</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                Active Monitoring
              </span>
            </div>
          </div>
          <p className="text-gray-500">Real-time analysis of company reputation and integrity risks</p>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* Left Sidebar - Fake Industries Widget */}
          <div className="col-span-3 bg-white border-r border-gray-200 h-[calc(100vh-140px)] flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-red-50">
               <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold uppercase tracking-wide text-sm">Latest Fake Industries</h3>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
              {fakeIndustries.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No fake industries detected recently
                </div>
              ) : (
                fakeIndustries.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-b border-gray-100 hover:bg-red-50 transition-colors border-l-4 border-l-transparent hover:border-l-red-500"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-bold text-gray-900">{item.company}</span>
                      <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{item.headline}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Content Area - Chat */}
          <div className="col-span-6 bg-white flex flex-col h-[calc(100vh-140px)]">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  Reputation Assistant
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">
                    System Online
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {messages.map((m) => (
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
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : m.role === "user" ? (
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
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
                          ? "bg-slate-800 text-white"
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
              <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about company reputation..."
                    className="bg-gray-50 border-gray-200 h-12"
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={typing}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Live Threats Feed */}
          <div className="col-span-3 bg-white border-l border-gray-200 h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-blue-500" />
                <h2 className="font-semibold text-gray-900">Live Stream</h2>
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100%-73px)] p-4 space-y-3">
              {liveFeed.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No active threats detected
                </div>
              ) : (
                liveFeed.map((threat, idx) => {
                  const severity = getSeverityColor(threat.category);
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
                            severity === "medium" && "bg-orange-100 text-orange-700",
                            severity === "low" && "bg-blue-100 text-blue-700"
                          )}
                        >
                          {threat.category}
                        </span>
                        <span className="text-xs text-gray-400">{threat.source}</span>
                      </div>
                      <div className="text-sm text-gray-900 font-medium mb-1 leading-snug">
                        {threat.company}
                      </div>
                      <div className="text-xs text-gray-800 mb-2 font-medium">
                        {threat.headline}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {threat.description}
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
