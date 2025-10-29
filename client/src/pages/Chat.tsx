import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Bot, User } from "lucide-react";
import { getSession, getMessagesBySession, createMessage } from "@/lib/api";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem("current_session_id");
    if (!sessionId) {
      toast.error("No session found. Please configure AI first.");
      setLocation("/config");
      return;
    }

    getSession(sessionId).then(session => {
      setSessionInfo(session);
      return getMessagesBySession(sessionId);
    }).then(msgs => {
      setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })));
    }).catch(() => {
      toast.error("Failed to load session");
      setLocation("/config");
    });
  }, [setLocation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const sessionId = localStorage.getItem("current_session_id");
    if (!sessionId) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      await createMessage({
        session_id: sessionId,
        role: "user",
        content: userMessage,
      });

      const response = await fetch(`/api/stream/chat?session_id=${sessionId}&message=${encodeURIComponent(userMessage)}`);
      
      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMsg: Message = {
        id: `temp-ai-${Date.now()}`,
        role: "assistant",
        content: "",
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") {
                  assistantContent += data.content;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === "assistant") {
                      lastMsg.content = assistantContent;
                    }
                    return newMsgs;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      await createMessage({
        session_id: sessionId,
        role: "assistant",
        content: assistantContent,
      });

    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="bg-white border-b shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Analysis Chat</h1>
            {sessionInfo && (
              <p className="text-sm text-gray-500">Model: {sessionInfo.model_name}</p>
            )}
          </div>
          <Button onClick={() => setLocation("/upload")} variant="outline">
            New Analysis
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <Card className="p-8 text-center">
              <Bot className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Start Your Analysis</h2>
              <p className="text-gray-600 mb-4">
                Ask me to perform EDA, forecasting, or any analysis on your dataset
              </p>
              <div className="text-left max-w-md mx-auto bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Try asking:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Please perform comprehensive EDA on my data"</li>
                  <li>• "Show me the correlation between variables"</li>
                  <li>• "Forecast the next 30 days"</li>
                </ul>
              </div>
            </Card>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <Card className={`p-4 max-w-3xl ${msg.role === "user" ? "bg-purple-600 text-white" : ""}`}>
                {msg.role === "assistant" ? (
                  <Streamdown>{msg.content}</Streamdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </Card>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about your data..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
