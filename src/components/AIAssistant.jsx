// src/components/AIAssistant.jsx
import { useState, useEffect, useRef } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const QUICK_PROMPTS = [
  "What are the rules for parking in Indian apartment societies?",
  "How to handle a noise complaint legally in India?",
  "What is the RWA's authority to impose fines?",
  "How to conduct an AGM as per apartment society rules?",
  "What documents are needed for tenant verification?",
  "How to calculate maintenance charges fairly?",
  "What are the rights of apartment owners in India?",
  "How to handle a resident who refuses to pay dues?",
  "What is a sinking fund and how much should we maintain?",
  "How to draft a formal notice to a resident?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Namaste! 🙏 I'm your SocietyOS AI Assistant, trained on Indian RWA laws, apartment society norms, and community management best practices.\n\nI can help you with:\n• Legal questions about RWA rules and resident rights\n• Drafting notices, minutes, and official communications\n• Conflict resolution strategies\n• Financial management advice\n• Maintenance best practices\n• Any society management questions\n\nHow can I help your society today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [societyContext, setSocietyContext] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.from("societies").select("name, city, total_flats, balance, monthly_fee").eq("id", SOCIETY_ID).single()
      .then(({ data }) => setSocietyContext(data));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput("");
    setMessages(p => [...p, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const endpoint = import.meta.env.VITE_AI_ENDPOINT || "https://api.anthropic.com/v1/messages";
      const contextStr = societyContext
        ? `Society: ${societyContext.name}, ${societyContext.city}. ${societyContext.total_flats} flats. Monthly fee: ₹${societyContext.monthly_fee}. Balance: ₹${societyContext.balance?.toLocaleString("en-IN")}.`
        : "";

      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert AI assistant for Indian apartment society (RWA) management. You have deep knowledge of:
- Indian apartment society laws and bye-laws
- RWA registration, compliance, and governance
- Maintenance fee collection and accounting
- Conflict resolution between residents
- Security, staff, and vendor management
- RERA, MahaRERA, and state-specific regulations
- Best practices from societies across India

${contextStr}

Be practical, specific to Indian context, and always cite relevant laws or norms when applicable. Keep responses concise but complete. Use bullet points for lists. When drafting documents, provide ready-to-use text.`,
          messages: [...history, { role: "user", content: userText }]
        })
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || "I'm unable to respond right now. Please check your AI connection.";
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: "Connection error. Please check your AI endpoint configuration in Cloudflare environment variables." }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat cleared. How can I help your society today?"
    }]);
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 500 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>AI Assistant</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Indian RWA law · conflict resolution · drafting · advice</p>
        </div>
        <button onClick={clearChat} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "8px 14px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>Clear Chat</button>
      </div>

      {/* Quick prompts */}
      <div style={{ flexShrink: 0, marginBottom: 14 }}>
        <div style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Quick Questions</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {QUICK_PROMPTS.slice(0, 5).map((p, i) => (
            <button key={i} onClick={() => send(p)} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: m.role === "user" ? "linear-gradient(135deg,#d97706,#f59e0b)" : "linear-gradient(135deg,#312e81,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {m.role === "user" ? "👤" : "✨"}
            </div>
            <div style={{ maxWidth: "80%", background: m.role === "user" ? "#1e2535" : "#161b27", border: `1px solid ${m.role === "user" ? "#2a2f45" : "#818cf822"}`, borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "12px 16px" }}>
              <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#312e81,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✨</div>
            <div style={{ background: "#161b27", border: "1px solid #818cf822", borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", animation: "pulse 1.4s infinite", animationDelay: `${i * 0.2}s`, opacity: 0.7 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about society management… (Enter to send, Shift+Enter for new line)"
            style={{ flex: 1, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, outline: "none", resize: "none", height: 52, fontFamily: "inherit", lineHeight: 1.5 }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ ...btnPrimary, padding: "0 20px", opacity: loading || !input.trim() ? 0.5 : 1, borderRadius: 12 }}>
            {loading ? "…" : "→"}
          </button>
        </div>
        <div style={{ color: "#2a2f45", fontSize: 11, marginTop: 6, textAlign: "center" }}>
          Powered by AI · Trained on Indian RWA laws and society management best practices
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
    </div>
  );
}
