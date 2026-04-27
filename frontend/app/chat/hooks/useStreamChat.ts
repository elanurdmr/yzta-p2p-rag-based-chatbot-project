// app/chat/hooks/useStreamChat.ts — SSE stream bağlantısını yöneten hook
// Backend'den gelen "data: {...}\n\n" satırlarını parse edip mesaj state'ini güncelliyor.
// 5 farklı event tipi var: message, token, follow_up, error, end

import { message as antMessage } from "antd";
import { Message, Source, ToolCallItem } from "../types/chat.types";

interface UseStreamChatProps {
  currentThreadId: string;
  agentId: string;
  setMessages: (fn: (prev: Message[]) => Message[]) => void;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
}

/** Tool sonucundan kaynak listesini parse eder.
 * Backend JSON döndürüyor ama string olarak geliyor — çift parse gerekiyor. */
function extractSources(result: string): Source[] {
  try {
    const parsed = JSON.parse(result);
    if (parsed?.sources && Array.isArray(parsed.sources)) {
      return parsed.sources as Source[];
    }
  } catch {
    // JSON değilse kaynak yok
  }
  return [];
}

/** Tool sonuç JSON'undan okunabilir metin çıkarır.
 * content veya message alanı varsa onu al, yoksa ham stringi döndür. */
function extractContent(result: string): string {
  try {
    const parsed = JSON.parse(result);
    if (parsed?.content) return parsed.content;
    if (parsed?.message) return parsed.message;
  } catch {
    // düz metin
  }
  return result;
}

export const useStreamChat = ({
  currentThreadId,
  agentId,
  setMessages,
  isStreaming,
  setIsStreaming,
}: UseStreamChatProps) => {
  /**
   * SSE stream başlatır.
   * @param input Kullanıcı mesajı
   * @param overrideAgentId Belirtilirse context agentId yerine bu kullanılır
   *   (örn: özetleme butonuna basıldığında "ozetleme-asistani" zorla gönderilir)
   */
  const handleStream = async (input: string, overrideAgentId?: string) => {
    if (!input.trim() || isStreaming) return;
    setIsStreaming(true);

    // kullanıcı ve AI mesajlarını hemen ekle — AI içeriği stream geldikçe dolacak
    const userMsg: Message = { id: `user_${Date.now()}`, type: "user", content: input };
    const aiMsg: Message = { id: `ai_${Date.now()}`, type: "ai", content: "", sources: [] };
    setMessages((prev) => [...prev, userMsg, aiMsg]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: currentThreadId,
            role: "user",
            message: input,
            agent_id: overrideAgentId ?? agentId,
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE satırları "\n" ile ayrılıyor, "data: " prefix'i var
        chunk.split("\n").forEach((line) => {
          if (!line.startsWith("data: ")) return;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "message") handleMessageData(data.content);
            else if (data.type === "token") handleTokenData(data.content);
            else if (data.type === "follow_up") handleFollowUpData(data.questions);
            else if (data.type === "error") handleErrorData(data.content);
            else if (data.type === "end") {
              setIsStreaming(false);
              reader.cancel();
            }
          } catch {
            // parse hatası — bu satırı atla
          }
        });
      }
    } catch (error) {
      console.error("İstek başarısız:", error);
      antMessage.error("İstek başarısız oldu. Lütfen daha sonra tekrar deneyin.");
      setIsStreaming(false);
    }
  };

  const handleMessageData = (content: any) => {
    // AI tool çağrısı mesajı — araç çağrılarını son mesaja ekle
    if (content.type === "ai" && content.tool_calls?.length > 0) {
      setMessages((prev) => {
        const existingCalls: ToolCallItem[] = prev[prev.length - 1].toolCall?.calls ?? [];
        const existingIds = new Set(existingCalls.map((c) => c.id));
        // aynı ID'li çağrıyı iki kez ekleme
        const newCalls: ToolCallItem[] = content.tool_calls
          .filter((tc: any) => !existingIds.has(tc.id))
          .map((tc: any) => ({ id: tc.id, name: tc.name, args: tc.args }));

        return prev.map((msg, i) =>
          i === prev.length - 1
            ? { ...msg, toolCall: { calls: [...existingCalls, ...newCalls] } }
            : msg
        );
      });
    }

    // AI final metin yanıtı
    if (content.type === "ai" && content.content) {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, content: content.content } : msg
        )
      );
    }

    // Tool sonucu — kaynakları parse edip hem çağrıya hem mesaja ata
    if (content.type === "tool") {
      const resultText = content.content ?? "";
      const sources = extractSources(resultText);
      const readableContent = extractContent(resultText);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const updatedCalls = (last.toolCall?.calls ?? []).map((call) =>
          call.id === content.tool_call_id
            ? { ...call, result: readableContent, sources }
            : call
        );

        // tüm kaynak çağrılarından benzersiz kaynakları mesaj seviyesinde de tut
        const allSources: Source[] = updatedCalls.flatMap((c) => c.sources ?? []);
        const uniqueSources = allSources.filter(
          (s, idx, arr) => arr.findIndex((x) => x.file === s.file && x.page === s.page) === idx
        );

        return prev.map((msg, i) =>
          i === prev.length - 1
            ? { ...msg, toolCall: { calls: updatedCalls }, sources: uniqueSources }
            : msg
        );
      });
    }
  };

  const handleTokenData = (token: string) => {
    // token bazlı streaming — her token gelince son mesaja ekle
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 ? { ...msg, content: msg.content + token } : msg
      )
    );
  };

  const handleFollowUpData = (questions: string[]) => {
    if (!questions?.length) return;
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 ? { ...msg, followUpQuestions: questions } : msg
      )
    );
  };

  const handleErrorData = (errorContent: string) => {
    // 429 için özel mesaj — kullanıcı quota neden doldu bilsin
    const is429 = errorContent.includes("429") || errorContent.includes("quota") || errorContent.includes("Quota");
    const userMessage = is429
      ? "⏳ API kotası doldu. Lütfen 1-2 dakika bekleyip tekrar deneyin."
      : `❌ Bir hata oluştu: ${errorContent.slice(0, 120)}`;

    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 ? { ...msg, content: userMessage } : msg
      )
    );
    setIsStreaming(false);
  };

  return { handleStream };
};
