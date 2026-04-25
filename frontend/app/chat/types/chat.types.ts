export interface Source {
  index: number;
  file: string;
  page: number | null;
  score: number;
  preview: string;
}

export interface ToolCallItem {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  sources?: Source[];
}

export interface Message {
  id: string;
  type: "user" | "ai" | "tool";
  content: string;
  toolCall?: { calls: ToolCallItem[] };
  sources?: Source[];
  followUpQuestions?: string[];
}

export interface ChatComponentProps {
  threadId: string;
}
