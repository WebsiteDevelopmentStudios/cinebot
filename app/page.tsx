"use client";

import { useState, useEffect } from "react";

type Message = {
  role: string;
  content: string;
};

export default function Home() {
  // Load chat history from local storage on page load
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("uncle_ares_chat");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Save messages to local storage every time they change
  useEffect(() => {
    localStorage.setItem("uncle_ares_chat", JSON.stringify(messages));
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("uncle_ares_chat");
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { role: "user", content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages }),
      });

      const data = await response.json();
      const assistantMessage: Message = { role: "assistant", content: data.message };
      
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center p-4 bg-gray-950 text-white">
      <div className="w-full max-w-3xl flex flex-col flex-1 min-h-0">
        <div className="flex justify-between items-center mb-4 shrink-0">
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
        
        {/* This container flexes so the input stays at the bottom without scrolling the page */}
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800 min-h-0">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-20">Ask me to write any code...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-900 text-right' : 'bg-gray-800 text-left'}`}>
                <pre className="whitespace-pre-wrap font-mono text-sm">{msg.content}</pre>
              </div>
            ))
          )}
        </div>

        {/* Input bar pinned to the bottom */}
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
            {isGenerating ? "Coding..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}

