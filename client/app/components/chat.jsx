"use client";
import React, { useState, useEffect, useRef } from "react";

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full p-4 rounded-xl bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-base ${className}`}
    {...props}
  />
);

const Button = ({ className = "", variant, ...props }) => {
  const base =
    "py-3 px-6 rounded-xl font-semibold transition duration-300 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-base";
  const variants = {
    outline: "bg-transparent text-white border border-zinc-600 hover:bg-zinc-700",
    default: "bg-blue-700 text-white hover:bg-blue-800",
  };
  return (
    <button
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
};

export default function ChatApp() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = { role: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });
      const data = await res.json();
      const content = data?.answer?.toString().trim() || "⚠️ No answer returned.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Server error." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-gradient-to-br from-gray-950 to-black p-4 font-sans">
      <div className="w-[90vw] md:w-[70vw] max-w-4xl h-[90vh] flex flex-col border border-gray-800 rounded-2xl bg-zinc-900 shadow-2xl overflow-hidden relative">
        {/* Title */}
        <header className="text-center py-4 border-b border-zinc-800 bg-zinc-950 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-400">💬 Chat with your PDFs</h1>
        </header>

        {/* Message area */}
        <section className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <p className="text-center text-zinc-500 italic">Start by asking something from your PDF...</p>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-5 py-3 rounded-lg shadow-md max-w-[80%] text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white self-end ml-auto rounded-br-none"
                  : "bg-zinc-700 text-white self-start rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-zinc-400 italic px-5 py-3 bg-zinc-700 rounded-lg w-fit animate-pulse">
              Assistant is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        {/* Input bar */}
        <footer className="p-4 border-t border-zinc-800 bg-zinc-950 flex gap-3 items-center">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button
            variant="outline"
            onClick={handleSend}
            disabled={loading || !message.trim()}
          >
            Send
          </Button>
        </footer>
      </div>

      {/* Scrollbar & animation styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
      `}</style>
    </div>
  );
}
