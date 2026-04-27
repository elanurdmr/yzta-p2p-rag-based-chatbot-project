"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "antd";
import { BarsOutlined } from "@ant-design/icons";
import "./globals.css";
import { v4 as uuidv4 } from "uuid";
import { LayoutContext } from "./layout-context";
import SessionListItem from "./components/SessionListItem";
import AgentSelector from "./components/AgentSelector";
import SiderComponent from "./components/SiderComponent";

const { Header, Content } = Layout;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface Session {
  threadId: string;
  name: string;
  lastUpdated: number;
}

export type DateGroup = "Bugün" | "Dün" | "Geçen Hafta" | "Daha Önce";

export interface GroupedSessions {
  label: DateGroup;
  sessions: Session[];
}

function getDateGroup(updatedAt: number): DateGroup {
  const diff = Date.now() - updatedAt;
  const day = 86_400_000;
  if (diff < day) return "Bugün";
  if (diff < 2 * day) return "Dün";
  if (diff < 7 * day) return "Geçen Hafta";
  return "Daha Önce";
}

export function groupSessionsByDate(sessions: Session[]): GroupedSessions[] {
  const order: DateGroup[] = ["Bugün", "Dün", "Geçen Hafta", "Daha Önce"];
  const map = new Map<DateGroup, Session[]>(order.map((l) => [l, []]));
  for (const s of sessions) {
    map.get(getDateGroup(s.lastUpdated))!.push(s);
  }
  return order
    .filter((l) => map.get(l)!.length > 0)
    .map((l) => ({ label: l, sessions: map.get(l)! }));
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("dokuman-asistani");
  const [mounted, setMounted] = useState(false);

  // Backend'den conversation listesini çek
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      if (!res.ok) throw new Error("API hatası");
      const data: Array<{ id: string; title: string; updated_at: number }> =
        await res.json();
      const mapped: Session[] = data.map((c) => ({
        threadId: c.id,
        name: c.title,
        lastUpdated: c.updated_at,
      }));
      setSessions(mapped);
      // LocalStorage'ı backend ile senkronize et (offline fallback için)
      localStorage.setItem("chatSessions", JSON.stringify(mapped));
    } catch {
      // Backend erişilemiyorsa localStorage'a geri dön
      try {
        const stored = localStorage.getItem("chatSessions");
        if (stored) setSessions(JSON.parse(stored));
      } catch {
        /* sessizce geç */
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchConversations().then(() => {
      // Aktif bir thread yoksa yeni UUID ata
      setCurrentThreadId((prev) => prev ?? uuidv4());
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni oturum ekle event'ini dinle (ChatComponent'ten gelir)
  useEffect(() => {
    const onAddSession = (event: Event) => {
      const { threadId, msg } = (event as CustomEvent).detail;
      // Optimistik güncelleme: hemen listeye ekle
      const newSession: Session = {
        threadId: threadId || uuidv4(),
        name: (msg as string).substring(0, 60).replace(/\n/g, " "),
        lastUpdated: Date.now(),
      };
      setSessions((prev) => {
        const exists = prev.some((s) => s.threadId === newSession.threadId);
        return exists ? prev : [newSession, ...prev];
      });
      setCurrentThreadId(newSession.threadId);
      window.history.pushState({}, "", `/chat/${newSession.threadId}`);
      // Kısa gecikme sonrası backend'den taze listeyi çek
      setTimeout(fetchConversations, 1500);
    };
    window.addEventListener("add-session", onAddSession);
    return () => window.removeEventListener("add-session", onAddSession);
  }, [fetchConversations]);

  const handleDeleteSession = async (delThreadId: string) => {
    // Önce backend'den sil
    try {
      await fetch(`${API_BASE}/conversations/${delThreadId}`, {
        method: "DELETE",
      });
    } catch {
      /* çevrimdışıysa yerel silme devam eder */
    }

    // Yerel mesajları temizle
    localStorage.removeItem("chatMessages-" + delThreadId);

    const newSessions = sessions.filter((s) => s.threadId !== delThreadId);
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));

    if (newSessions.length > 0) {
      const next = newSessions[0].threadId;
      setCurrentThreadId(next);
      window.history.pushState({}, "", `/chat/${next}`);
    } else {
      setCurrentThreadId(uuidv4());
      window.history.pushState({}, "", "/chat");
    }
  };

  const handlerNewChat = () => {
    setCurrentThreadId(uuidv4());
    window.history.pushState({}, "", "/chat");
  };

  const selectAgent = (value: string) => {
    setAgentId(value);
    handlerNewChat();
  };

  const grouped = groupSessionsByDate(sessions);

  const items = grouped.flatMap(({ label, sessions: groupSessions }) => [
    {
      key: `group-${label}`,
      type: "group" as const,
      label: (
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      ),
    },
    ...groupSessions.map((session) => ({
      key: session.threadId,
      label: (
        <SessionListItem session={session} onDelete={handleDeleteSession} />
      ),
    })),
  ]);

  return (
    <LayoutContext.Provider
      value={{ agentId, setAgentId, currentThreadId, setCurrentThreadId }}
    >
      <html lang="tr">
        <body className="min-h-screen">
          <Layout style={{ minHeight: "100vh" }}>
            {mounted && (
              <SiderComponent
                collapsed={collapsed}
                onCollapse={setCollapsed}
                sessions={sessions}
                handleDeleteSession={handleDeleteSession}
                handlerNewChat={handlerNewChat}
                items={items}
                onSelectSession={(key) => {
                  setCurrentThreadId(key);
                  window.history.pushState({}, "", `/chat/${key}`);
                }}
              />
            )}
            <Layout>
              <Header className="bg-white border-b border-gray-100 p-0 flex items-center flex-nowrap shadow-sm">
                <BarsOutlined
                  onClick={() => setCollapsed(!collapsed)}
                  className="ml-5 text-lg text-gray-500 cursor-pointer hover:text-indigo-500 transition-colors"
                />
                <span className="ml-5 text-base font-bold text-indigo-600 hidden sm:block">
                  Kendi Dokümanların ile Sohbet Et
                </span>
                <div className="flex items-center ml-auto mr-4 gap-2">
                  <span className="text-sm text-gray-500 hidden md:block">Ajan:</span>
                  <AgentSelector value={agentId} onChange={selectAgent} />
                </div>
              </Header>
              <Content className="bg-gray-50 min-h-[calc(100vh-64px)]">
                <div className="h-[calc(100vh-64px)] bg-white mx-4 my-3 rounded-2xl shadow-sm overflow-hidden">
                  {children}
                </div>
              </Content>
            </Layout>
          </Layout>
        </body>
      </html>
    </LayoutContext.Provider>
  );
}
