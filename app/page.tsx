"use client";

import { useState } from "react";

type Message = {
  role: string;
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessage: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMessage]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "");
            if (jsonStr === "[DONE]") continue;
            try {
              const json = JSON.parse(jsonStr);
              const delta = json.choices[0]?.delta?.content || "";
              assistantMessage.content += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-950 text-white">
      <div className="w-full max-w-3xl flex flex-col h-screen">
        <h1 className="text-3xl font-bold mb-4">⚡ Uncle Ares AI</h1>
        
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
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

        <div className="flex gap-2">
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
