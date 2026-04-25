"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import MessageInput from "../components/MessageInput";
import { useLayoutContext } from "../../layout-context";
import { Message, ChatComponentProps } from "../types/chat.types";
import { useStreamChat } from "../hooks/useStreamChat";
import MessageBubble from "../components/MessageBubble";
import useChatActions from "../hooks/useChatActions";

const SUMMARIZE_PROMPT =
  "Lütfen yüklü dokümanların içeriğini kapsamlı, yapılandırılmış ve madde madde özetle.";

const ChatComponent: React.FC<ChatComponentProps> = ({ threadId }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { agentId, currentThreadId, setCurrentThreadId } = useLayoutContext();

  // URL'den gelen threadId varsa bu zaten sidebar'a kayıtlı bir oturumdur
  const sessionRegisteredRef = useRef<boolean>(!!threadId);

  // threadId prop'u değişince (URL navigasyon): context'i senkronize et
  useEffect(() => {
    if (threadId) {
      setCurrentThreadId(threadId);
      sessionRegisteredRef.current = true;  // Mevcut oturum → zaten kayıtlı
    }
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);

  // Mesajları localStorage'a kaydet
  useEffect(() => {
    if (messages.length > 0 && currentThreadId) {
      localStorage.setItem("chatMessages-" + currentThreadId, JSON.stringify(messages));
    }
  }, [messages, currentThreadId]);

  useChatActions({ setMessages, setInput, isStreaming, setIsStreaming });

  // Thread değişince mesajları yükle (yeni thread → boş dizi)
  useEffect(() => {
    if (!currentThreadId) return;
    const stored = localStorage.getItem("chatMessages-" + currentThreadId);
    setMessages(stored ? JSON.parse(stored) : []);
  }, [currentThreadId]);

  const { handleStream } = useStreamChat({
    currentThreadId,
    agentId,
    setMessages,
    isStreaming,
    setIsStreaming,
  });

  /**
   * İlk mesaj gönderildiğinde oturumu sidebar'a kaydet.
   * layout.tsx'te UUID önceden atandığından currentThreadId her zaman mevcuttur;
   * sadece henüz kayıtlı olmayan (yeni) oturumlar için tetiklenir.
   */
  const dispatchNewSession = (msg: string) => {
    if (!sessionRegisteredRef.current && currentThreadId) {
      sessionRegisteredRef.current = true;
      window.dispatchEvent(
        new CustomEvent("add-session", { detail: { threadId: currentThreadId, msg } })
      );
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput("");
    dispatchNewSession(text);
    await handleStream(text);
  };

  const handleSummarize = async () => {
    if (isStreaming) return;
    dispatchNewSession(SUMMARIZE_PROMPT);
    // Özetleme her zaman uzman ajanla yapılır; kullanıcının seçtiği ajandan bağımsız
    await handleStream(SUMMARIZE_PROMPT, "ozetleme-asistani");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mesaj alanı */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4 py-12">
            <div className="text-4xl">📄</div>
            <h2 className="text-2xl font-bold text-indigo-600">
              Kendi Dokümanların ile Sohbet Et
            </h2>
            <p className="text-gray-500 max-w-md text-sm leading-relaxed">
              Sol panelden <strong>PDF, DOCX veya TXT</strong> dosyanızı yükleyin,
              ardından soru sorun ya da <strong>Özetle</strong> butonuna tıklayın.
            </p>
            <div className="flex gap-3 mt-2">
              {["📎 Doküman yükle", "💬 Soru sor", "📝 Özetle"].map((tip) => (
                <span
                  key={tip}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium"
                >
                  {tip}
                </span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming}
            onFollowUpSelect={async (question) => {
              if (isStreaming) return;
              dispatchNewSession(question);
              await handleStream(question);
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Giriş alanı */}
      <MessageInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleSummarize={handleSummarize}
        isStreaming={isStreaming}
      />
    </div>
  );
};

export default ChatComponent;
