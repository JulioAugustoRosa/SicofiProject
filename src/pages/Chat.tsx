import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, ChatMessage } from "@/lib/chat-stream";
import { motion } from "framer-motion";
import { Send, Bot, User as UserIcon, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content: "Olá! 👋 Sou seu assistente financeiro do **SICOFI**.\n\nEstou aqui para ajudar você a organizar sua vida financeira de forma simples e inteligente.\n\nVocê pode me dizer coisas como:\n- \"Gastei R$ 200 no mercado\"\n- \"Recebi R$ 5.000 de salário\"\n- \"Quero criar uma meta de R$ 10.000 para viagem\"\n\nE eu vou registrar tudo automaticamente! Para começar, me conte: **qual é a sua renda mensal?** 💰"
};

// Parse AI response for structured financial actions
function parseFinancialActions(content: string): Array<{
  action: string;
  type?: string;
  description?: string;
  amount?: number;
  frequency?: string;
  goalName?: string;
  targetAmount?: number;
  currentAmount?: number;
  monthlyContribution?: number;
  deadline?: string;
}> {
  const actions: Array<any> = [];
  
  // Look for JSON action blocks in the response
  const jsonBlockRegex = /```json:action\s*([\s\S]*?)```/g;
  let match;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        actions.push(...parsed);
      } else {
        actions.push(parsed);
      }
    } catch { /* ignore parse errors */ }
  }
  
  return actions;
}

// Process financial actions from AI response
async function processFinancialActions(content: string, userId: string) {
  const actions = parseFinancialActions(content);
  
  for (const action of actions) {
    try {
      if (action.action === "create_transaction" && action.amount && action.description) {
        await supabase.from("transactions").insert({
          user_id: userId,
          description: action.description,
          amount: action.amount,
          type: action.type || "expense",
          frequency: action.frequency || "once",
          date: new Date().toISOString().split("T")[0],
        });
      } else if (action.action === "delete_transaction" && action.description) {
        // Find and delete matching transaction
        const { data } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .ilike("description", `%${action.description}%`)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          await supabase.from("transactions").delete().eq("id", data[0].id);
        }
      } else if (action.action === "update_transaction" && action.description) {
        const { data } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .ilike("description", `%${action.description}%`)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          const updates: any = {};
          if (action.amount) updates.amount = action.amount;
          if (action.type) updates.type = action.type;
          await supabase.from("transactions").update(updates).eq("id", data[0].id);
        }
      } else if (action.action === "create_goal" && action.goalName && action.targetAmount) {
        await supabase.from("goals").insert({
          user_id: userId,
          name: action.goalName,
          target_amount: action.targetAmount,
          current_amount: action.currentAmount || 0,
          monthly_contribution: action.monthlyContribution || 0,
          deadline: action.deadline || null,
        });
      } else if (action.action === "update_goal" && action.goalName) {
        const { data } = await supabase
          .from("goals")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", `%${action.goalName}%`)
          .limit(1);
        if (data && data.length > 0) {
          const updates: any = {};
          if (action.targetAmount) updates.target_amount = action.targetAmount;
          if (action.currentAmount !== undefined) updates.current_amount = action.currentAmount;
          if (action.monthlyContribution) updates.monthly_contribution = action.monthlyContribution;
          await supabase.from("goals").update(updates).eq("id", data[0].id);
        }
      }
    } catch (e) {
      console.error("Error processing action:", e);
    }
  }
  
  return actions.length;
}

// Strip action blocks from displayed content
function cleanContentForDisplay(content: string): string {
  return content.replace(/```json:action\s*[\s\S]*?```/g, "").trim();
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll - use a ref to track content changes for streaming
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Also scroll during streaming via MutationObserver
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const observer = new MutationObserver(() => {
      container.scrollTop = container.scrollHeight;
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Load conversations list
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data && data.length > 0) {
      setConversations(data);
      if (!activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    } else {
      await createNewConversation(true);
    }
    setLoaded(true);
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !user) return;
    loadMessages(activeConversationId);
  }, [activeConversationId, user]);

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user!.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
    } else {
      setMessages([INITIAL_GREETING]);
      await supabase.from("chat_messages").insert({
        user_id: user!.id,
        role: "assistant",
        content: INITIAL_GREETING.content,
        conversation_id: conversationId,
      });
    }
  };

  const createNewConversation = async (isFirst = false) => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Nova conversa" })
      .select("id, title, created_at")
      .single();

    if (data) {
      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      setMessages([INITIAL_GREETING]);
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: INITIAL_GREETING.content,
        conversation_id: data.id,
      });
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        await createNewConversation();
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !activeConversationId) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: userMsg.content,
      conversation_id: activeConversationId,
    });

    // Update conversation title from first user message
    if (messages.length <= 1) {
      const title = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? "..." : "");
      await supabase.from("conversations").update({ title }).eq("id", activeConversationId);
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title } : c));
    }

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversationId);

    // Use a ref-like approach to accumulate the full response
    let fullResponse = "";
    
    const updateAssistantMessage = (chunk: string) => {
      fullResponse += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return [...prev.slice(0, -1), { role: "assistant" as const, content: fullResponse }];
        }
        return [...prev, { role: "assistant" as const, content: fullResponse }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => updateAssistantMessage(chunk),
        onDone: async () => {
          setIsLoading(false);
          if (fullResponse) {
            // Save the complete assistant message
            await supabase.from("chat_messages").insert({
              user_id: user.id,
              role: "assistant",
              content: fullResponse,
              conversation_id: activeConversationId,
            });
            
            // Process any financial actions in the response
            const actionsCount = await processFinancialActions(fullResponse, user.id);
            if (actionsCount > 0) {
              toast({ 
                title: "✅ Registrado!", 
                description: `${actionsCount} lançamento(s) registrado(s) automaticamente.` 
              });
            }
          }
        },
        onError: (error) => {
          setIsLoading(false);
          toast({ title: "Erro", description: error, variant: "destructive" });
        },
      });
    } catch {
      setIsLoading(false);
      toast({ title: "Erro", description: "Falha ao conectar com a IA", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] gap-4">
      {/* Conversations sidebar */}
      <div className="w-64 hidden md:flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Conversas</h2>
          <button
            onClick={() => createNewConversation()}
            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            title="Nova conversa"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-1 scrollbar-thin">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                activeConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
              onClick={() => setActiveConversationId(conv.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{conv.title}</span>
              {conversations.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex md:hidden items-center justify-between mb-3">
          <h1 className="text-lg font-display font-bold">Chat Financeiro</h1>
          <button
            onClick={() => createNewConversation()}
            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="hidden md:block mb-4">
          <h1 className="text-2xl font-display font-bold">Chat Financeiro</h1>
          <p className="text-sm text-muted-foreground">Converse naturalmente para organizar suas finanças</p>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto scrollbar-thin space-y-4 pr-2">
          {messages.map((msg, i) => {
            const displayContent = msg.role === "assistant" ? cleanContentForDisplay(msg.content) : msg.content;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "bg-primary/10" : "bg-secondary"
                }`}>
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass-card rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_strong]:text-foreground">
                      <ReactMarkdown>{displayContent}</ReactMarkdown>
                    </div>
                  ) : (
                    displayContent
                  )}
                </div>
              </motion.div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-4 glass-card p-3 flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Gastei R$ 150 no mercado hoje..."
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none max-h-32"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
