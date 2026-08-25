"use client";

import { useState, useEffect, useRef } from "react";

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
  const [copied, setCopied] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("uncle_ares_chat", JSON.stringify(messages));
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("uncle_ares_chat");
    setAttachedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyCode = (code: string, idx: string) => {
    navigator.clipboard.writeText(code);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0 || isGenerating) return;

    let finalInput = input;

    // Process attached files into text format for the AI
    if (attachedFiles.length > 0) {
      const fileContentsPromises = attachedFiles.map(async (file) => {
        const text = await file.text();
        return `- File: ${file.name}\n\`\`\`\n${text}\n\`\`\``;
      });
      const fileContents = await Promise.all(fileContentsPromises);
      
      finalInput += "\n\nAttached Files:\n" + fileContents.join("\n\n");
    }

    const userMessage: Message = { 
      role: "user", 
      content: finalInput, 
      thinking: "", 
      code: "" 
    };
    
    const currentMessages = [...messages, userMessage];
    
    // Don't send 'thinking' or 'code' fields to the API
    const apiMessages = currentMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    setMessages(currentMessages);
    setInput("");
    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsGenerating(true);

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
        finalContent = rawReply.replace(codeRegex, "[See Code Section]").trim();
      }
      
      const assistantMessage: Message = { 
        role: "assistant", 
        content: finalContent,
        thinking: rawThinking,
        code: extractedCode
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center p-4 bg-[#0a0a0f] text-slate-200">
      <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-violet-500">⚡</span>
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">Uncle Ares AI</span>
          </h1>
          {messages.length > 0 && (
            <button 
              onClick={handleClearChat}
              className="px-4 py-1.5 text-sm bg-slate-900/80 rounded-lg border border-slate-700 hover:border-violet-500 hover:text-violet-300 transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-4 p-2 bg-slate-950/40 rounded-2xl border border-slate-800/80 min-h-0">
          {messages.length === 0 ? (
            <p className="text-slate-600 text-center mt-20 italic">Upload your files and ask me to write any code...</p>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`mb-4 p-4 rounded-xl border ${
                  msg.role === 'user' 
                    ? 'bg-slate-900/60 border-slate-700/50' 
                    : 'bg-gradient-to-br from-slate-900 to-slate-950 border-violet-500/20'
                }`}
              >
                {/* Responsive 3-column layout for Assistant, standard layout for User */}
                {msg.role === 'user' ? (
                  <div>
                    <span className="text-xs font-bold text-violet-400 uppercase mb-2 block">You</span>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">{msg.content}</pre>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Chat Tab */}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-violet-400 uppercase mb-2 border-b border-violet-500/30 pb-1">Chat</span>
                      <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 overflow-x-auto">
                        {msg.content}
                      </pre>
                    </div>

                    {/* Thinking Tab */}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-400 uppercase mb-2 border-b border-amber-500/30 pb-1">Thinking</span>
                      <pre className="whitespace-pre-wrap font-mono text-sm text-slate-400 italic overflow-x-auto">
                        {msg.thinking && msg.thinking.length > 0 ? msg.thinking : "(No thoughts generated)"}
                      </pre>
                    </div>

                    {/* Code Tab */}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-400 uppercase mb-2 border-b border-emerald-500/30 pb-1">Code</span>
                      <div className="relative h-full">
                        {msg.code ? (
                          <>
                            <div className="absolute top-0 right-0 z-10">
                              <button 
                                onClick={() => handleCopyCode(msg.code, `code-${idx}`)}
                                className="px-3 py-1 text-xs bg-emerald-600/90 text-white rounded hover:bg-emerald-500 transition-colors"
                              >
                                {copied === `code-${idx}` ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-sm bg-black/40 p-3 rounded border border-emerald-500/20 text-emerald-300/90 overflow-x-auto h-full max-h-96">
                              {msg.code}
                            </pre>
                          </>
                        ) : (
                          <p className="text-slate-600 text-center text-sm italic mt-4">(No code extracted)</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-slate-900/80 p-3 rounded-xl border border-slate-800 backdrop-blur">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-violet-400">📎</span>
                  {file.name}
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            {/* File Upload Button */}
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <button 
              className="px-4 py-3 bg-slate-800 text-violet-400 rounded-xl hover:bg-slate-700 border border-slate-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Files"
            >
              📂
            </button>

            <textarea
              className="flex-1 bg-slate-950 rounded-xl border border-slate-700 focus:border-violet-500 outline-none resize-none p-3 text-slate-200"
              placeholder="Ask me to write any code, or attach a file to modify..."
              rows={1}
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
              className="px-6 py-3 bg-violet-600 rounded-xl font-bold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSend}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
    }
      
