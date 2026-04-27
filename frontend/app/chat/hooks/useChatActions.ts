// app/chat/hooks/useChatActions.ts — sohbet düzeyindeki aksiyonlar
// Şu an sadece "yeni sohbet" (mesajları temizle) var.
// İleride "mesajı kopyala", "sohbeti dışa aktar" gibi şeyler buraya eklenebilir.

import { SetStateAction } from 'react';
import { Message } from '../types/chat.types';

interface UseChatActionsProps {
  setMessages: (value: SetStateAction<Message[]>) => void;
  setInput: (value: SetStateAction<string>) => void;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
}

const useChatActions = ({ setMessages, setInput, isStreaming, setIsStreaming }: UseChatActionsProps) => {
  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    // stream devam ediyorsa durdur — yeni chat'e geçilince eski akış kesilmeli
    if (isStreaming) {
      setIsStreaming(false);
    }
  };

  return { handleNewChat };
};

export default useChatActions;
