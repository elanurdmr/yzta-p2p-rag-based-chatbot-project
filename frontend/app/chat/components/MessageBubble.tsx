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
  const isThinking = type === "ai" && isStreaming && content === "";

  return (
    <div className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-3 max-w-[85%]`}>
        {/* Avatar */}
        <Avatar
          size={36}
          className={`flex-shrink-0 ${isUser ? "bg-blue-500" : "bg-indigo-600"}`}
        >
          {isUser ? <UserOutlined /> : <RobotOutlined />}
        </Avatar>

        {/* Balon */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-blue-500 text-white rounded-tr-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
            }`}
          >
            {isThinking ? (
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
                {/* Araç çağrısı detayları (daraltılabilir) */}
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

                {/* Ana içerik */}
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

          {/* Kaynak paneli (sadece AI mesajları için) */}
          {!isUser && sources && sources.length > 0 && (
            <SourcePanel sources={sources} />
          )}

          {/* Akıllı takip soruları */}
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
