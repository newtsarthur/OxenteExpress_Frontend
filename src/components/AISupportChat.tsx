import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, TOKEN_KEY } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_QUERIES = 5;

export default function AISupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    const history = messages.length > 0
      ? [...messages].slice(-6).map((m) => ({ role: m.role, content: m.content }))
      : [];

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const res = await fetch(`${API_BASE_URL}/support/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMsg.content, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao se comunicar com o assistente.");
        setRemaining(data.remaining ?? 0);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      setRemaining(data.remaining ?? MAX_QUERIES);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // Saudação inicial
  const greeting = messages.length === 0;

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110",
          open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100",
          "gradient-primary text-primary-foreground hover:shadow-xl"
        )}
        aria-label="Abrir chat com IA"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Painel de chat */}
      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none",
          "w-[min(100vw-2rem,22rem)] h-[min(28rem,85vh)] bg-background border border-border"
        )}
      >
        {/* Header */}
        <div className="gradient-primary px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-foreground">Oxente AI</p>
            <p className="text-xs text-primary-foreground/70 truncate">
              {remaining !== null
                ? `${remaining} de ${MAX_QUERIES} perguntas disponíveis`
                : "Assistente de suporte"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mensagens */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div ref={scrollRef} className="flex flex-col space-y-3 min-h-full">
            {greeting && (
              <div className="flex gap-2.5 items-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm max-w-[85%]">
                  <p>Oxente! Eu sou a <strong>Oxente AI</strong> 🤠</p>
                  <p className="mt-1 text-muted-foreground">
                    Como posso ajudar? Pergunte sobre pedidos, lojas, entregas ou qualquer coisa do Oxente Express!
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5 items-start",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "user" ? "bg-secondary/20" : "bg-primary/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-secondary" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted rounded-tl-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t p-3 shrink-0 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua dúvida..."
            className="flex-1 h-9 text-sm"
            maxLength={500}
            disabled={loading}
          />
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground h-9 w-9 p-0 shrink-0"
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Remaining counter footer */}
        {remaining !== null && (
          <div className="bg-muted/70 px-3 py-1.5 flex items-center justify-center shrink-0 border-t">
            <p className="text-xs text-muted-foreground">
              {remaining > 0
                ? `${remaining}/${MAX_QUERIES} perguntas restantes neste ciclo`
                : "Limite atingido — tente novamente mais tarde"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
