import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
}

export default function Chat() {
  const params = useParams();
  const sessionId = parseInt(params.id as string);
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: session, isLoading: sessionLoading } = trpc.chat.getSession.useQuery({ sessionId });
  const { data: historyMessages, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery({ sessionId });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  useEffect(() => {
    if (historyMessages) {
      setMessages(historyMessages.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      })));
    }
  }, [historyMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStreamResponse = async (message: string) => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Add user message to UI
    const userMessage: Message = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for assistant response
    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Stream request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content") {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === "assistant") {
                    lastMessage.content += parsed.data;
                  }
                  return newMessages;
                });
              } else if (parsed.type === "tool_call") {
                console.log("Tool call:", parsed.data);
                // You can display tool calls in the UI if needed
              } else if (parsed.type === "error") {
                toast.error(`Error: ${parsed.message}`);
              } else if (parsed.type === "done") {
                setIsStreaming(false);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Stream aborted");
      } else {
        console.error("Stream error:", error);
        toast.error("Failed to get response from AI");
      }
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput("");

    // Save message to database
    await sendMessageMutation.mutateAsync({
      sessionId,
      message,
    });

    // Start streaming response
    await handleStreamResponse(message);
  };

  if (sessionLoading || messagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-4">The requested chat session could not be found.</p>
          <Button onClick={() => setLocation("/")}>Back to Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {session.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered data analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Start Your Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Ask me to analyze your data. Try commands like:
              </p>
              <div className="max-w-md mx-auto space-y-2 text-left">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <code className="text-sm text-blue-700 dark:text-blue-300">
                    "Please perform EDA on my data"
                  </code>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <code className="text-sm text-green-700 dark:text-green-300">
                    "Forecast the sales column for the next 30 days"
                  </code>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <code className="text-sm text-purple-700 dark:text-purple-300">
                    "Show me the correlation between variables"
                  </code>
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                }`}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <Streamdown>{message.content}</Streamdown>
                    {message.metadata?.toolCalls && (
                      <div className="mt-4 space-y-2">
                        {message.metadata.toolCalls.map((call: any, idx: number) => (
                          <div key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 rounded p-2">
                            <strong>Tool:</strong> {call.tool}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Analyzing...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to analyze your data..."
              disabled={isStreaming}
              className="flex-1"
            />
            <Button type="submit" disabled={isStreaming || !input.trim()}>
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
