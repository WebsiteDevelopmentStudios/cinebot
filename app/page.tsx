"use client";

import { useState, useEffect } from "react";

type Message = {
  role: string;
  content: string;
  thinking: string;
  code: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("uncle_ares_chat");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem("uncle_ares_chat", JSON.stringify(messages));
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("uncle_ares_chat");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { role: "user", content: input, thinking: "", code: "" };
    const currentMessages = [...messages, userMessage];
    
    // Don't send 'thinking' or 'code' fields to the API
    const apiMessages = currentMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    setMessages(currentMessages);
    setInput("");
    setIsGenerating(true);
    setActiveTab("thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();
      
      let rawReply = data.message || "(No text generated)";
      let rawThinking = data.thinking || "";
      let extractedCode = "";

      // Extract code from triple backticks
      const codeRegex = /```(?:[a-zA-Z]+\n)?([\s\S]*?)```/g;
      let match;
      while ((match = codeRegex.exec(rawReply)) !== null) {
        extractedCode += match[1].trim() + "\n\n";
      }
      extractedCode = extractedCode.trim();

      let finalContent = rawReply;
      if (extractedCode) {
        finalContent = rawReply.replace(codeRegex, "[See Code tab]").trim();
      }
      
      const assistantMessage: Message = { 
        role: "assistant", 
        content: finalContent,
        thinking: rawThinking,
        code: extractedCode
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Auto switch to code tab if code exists, otherwise chat
      if (extractedCode) {
        setActiveTab("code");
      } else {
        setActiveTab("chat");
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center p-4 bg-gray-950 text-white">
      <div className="w-full max-w-3xl flex flex-col flex-1 min-h-0">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <h1 className="text-3xl font-bold">⚡ Uncle Ares AI</h1>
          {messages.length > 0 && (
            <button 
              onClick={handleClearChat}
              className="px-3 py-1 text-sm bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700"
            >
              Clear Chat
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4 shrink-0">
          <button 
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1 rounded-lg text-sm ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Chat
          </button>
          <button 
            onClick={() => setActiveTab("thinking")}
            className={`px-4 py-1 rounded-lg text-sm ${activeTab === 'thinking' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Thinking
          </button>
          <button 
            onClick={() => setActiveTab("code")}
            className={`px-4 py-1 rounded-lg text-sm ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Code
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800 min-h-0">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-20">Ask me to write any code...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-900 text-right' : 'bg-gray-800 text-left'}`}>
                {activeTab === 'chat' && (
                  <pre className="whitespace-pre-wrap font-mono text-sm">{msg.content}</pre>
                )}
                {activeTab === 'thinking' && (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-400 italic">
                    {msg.role === 'user' 
                      ? msg.content 
                      : (msg.thinking && msg.thinking.length > 0 ? msg.thinking : "(No thoughts generated)")}
                  </pre>
                )}
                {activeTab === 'code' && (
                  msg.code ? (
                    <div>
                      <div className="flex justify-end mb-2">
                        <button 
                          onClick={() => handleCopyCode(msg.code)}
                          className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500"
                        >
                          {copied ? "Copied!" : "Copy Code"}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-950 p-3 rounded border border-gray-700">
                        {msg.code}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center text-sm italic">(No code extracted)</p>
                  )
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <textarea
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none resize-none"
            placeholder="e.g., Write a Python script to scrape a website."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="px-6 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50"
            onClick={handleSend}
            disabled={isGenerating}
          >
            {isGenerating ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
            }
    
