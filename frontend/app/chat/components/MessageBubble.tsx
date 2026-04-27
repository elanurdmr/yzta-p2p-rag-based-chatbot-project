// app/chat/components/MessageBubble.tsx — tek bir mesajın görsel temsili
// Kullanıcı mesajları sağda mavi balon, AI mesajları solda beyaz balon olarak gösteriliyor.
// Tool call detayları daraltılabilir bir Collapse içinde saklı tutuluyor.

import React from "react";
import { Avatar, Collapse, Spin } from "antd";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { Message } from "../types/chat.types";
import SourcePanel from "./SourcePanel";
import FollowUpChips from "./FollowUpChips";

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
  onFollowUpSelect?: (question: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming, onFollowUpSelect }) => {
  const { type, content, toolCall, sources, followUpQuestions } = message;
  const isUser = type === "user";
  // content boş ama streaming devam ediyorsa "düşünüyor" animasyonu göster
  const isThinking = type === "ai" && isStreaming && content === "";

  return (
    <div className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-3 max-w-[85%]`}>
        {/* avatar rengi: kullanıcı = mavi, AI = indigo */}
        <Avatar
          size={36}
          className={`flex-shrink-0 ${isUser ? "bg-blue-500" : "bg-indigo-600"}`}
        >
          {isUser ? <UserOutlined /> : <RobotOutlined />}
        </Avatar>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-blue-500 text-white rounded-tr-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
            }`}
          >
            {isThinking ? (
              // tool çağrısı bekleniyorsa farklı mesaj göster
              toolCall ? (
                <div className="flex items-center gap-2 text-indigo-400">
                  <Spin size="small" />
                  <span className="text-xs">araç çağrılıyor...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <Spin size="small" />
                  <span className="text-xs">yanıt üretiliyor...</span>
                </div>
              )
            ) : (
              <>
                {/* araç çağrısı detayları — varsayılan olarak kapalı, isteğe bağlı açılır */}
                {toolCall?.calls && toolCall.calls.length > 0 && (
                  <Collapse
                    ghost
                    size="small"
                    className="mb-2 -mx-1"
                    items={toolCall.calls.map((call, idx) => ({
                      key: idx,
                      label: (
                        <span className="text-xs text-indigo-500 font-medium">
                          🔍 {call.name === "search_documents" ? "Doküman Arandı" : call.name}
                          {" "}— {JSON.stringify(call.args).slice(0, 50)}
                        </span>
                      ),
                      children: call.result ? (
                        <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4">
                          {call.result.slice(0, 300)}
                          {call.result.length > 300 ? "..." : ""}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sonuç bekleniyor...</span>
                      ),
                    }))}
                  />
                )}

                {/* kullanıcı mesajı düz metin, AI mesajı markdown */}
                {isUser ? (
                  <p className="whitespace-pre-wrap">{content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </div>

          {/* kaynak paneli sadece AI mesajları altında göster */}
          {!isUser && sources && sources.length > 0 && (
            <SourcePanel sources={sources} />
          )}

          {/* takip soruları: stream bitmeden gösterme, boşsa da gösterme */}
          {!isUser && !isStreaming && followUpQuestions && followUpQuestions.length > 0 && (
            <FollowUpChips
              questions={followUpQuestions}
              onSelect={onFollowUpSelect ?? (() => {})}
              disabled={isStreaming}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
