import React from "react";
import { Button, Input, Tooltip } from "antd";
import { SendOutlined, FileTextOutlined } from "@ant-design/icons";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  handleSummarize: () => void;
  isStreaming: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  handleSend,
  handleSummarize,
  isStreaming,
}) => {
  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-white">
      <div className="flex gap-2 items-end">
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sorunuzu yazın... (Enter = gönder, Ctrl+Enter = yeni satır)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              if (!isStreaming && input.trim()) handleSend();
            }
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              setInput(input + "\n");
            }
          }}
          disabled={isStreaming}
          autoSize={{ minRows: 2, maxRows: 6 }}
          className="flex-1 rounded-xl resize-none"
        />

        <div className="flex flex-col gap-1.5">
          {/* Gönder */}
          <Tooltip title="Gönder">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              loading={isStreaming}
              className="h-10 w-10 rounded-xl flex items-center justify-center"
            />
          </Tooltip>

          {/* Özetle */}
          <Tooltip title="Yüklü dokümanları özetle">
            <Button
              icon={<FileTextOutlined />}
              onClick={handleSummarize}
              disabled={isStreaming}
              className="h-10 w-10 rounded-xl flex items-center justify-center border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:text-indigo-600"
            />
          </Tooltip>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5 pl-1">
        {isStreaming ? "⏳ Yanıt üretiliyor..." : "Enter ile gönder · Ctrl+Enter yeni satır"}
      </p>
    </div>
  );
};

export default MessageInput;
