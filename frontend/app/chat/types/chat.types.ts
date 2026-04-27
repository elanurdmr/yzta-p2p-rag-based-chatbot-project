// app/chat/types/chat.types.ts — sohbet arayüzü için TypeScript tip tanımları
// Tüm bileşenler ve hook'lar bu tipleri import ediyor — merkezi tutmak iyi oldu.

export interface Source {
  index: number;
  file: string;
  page: number | null;  // PDF dışı dosyalarda sayfa yok, null geliyor
  score: number;        // 0-1 arası benzerlik skoru
  preview: string;      // chunk'ın ilk 120 karakteri
}

export interface ToolCallItem {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;       // araç yanıtı — streaming sırasında sonradan doluyor
  sources?: Source[];    // araç JSON'undan parse edilen kaynaklar
}

export interface Message {
  id: string;
  type: "user" | "ai" | "tool";
  content: string;
  toolCall?: { calls: ToolCallItem[] };  // AI araç çağırdıysa bu dolu
  sources?: Source[];                    // toplam kaynaklar (tool call'lardan birleştiriliyor)
  followUpQuestions?: string[];          // backend'den gelen takip soruları
}

export interface ChatComponentProps {
  threadId: string;  // URL'deki [threadId] — geçmiş oturuma gidildiğinde geliyor
}
