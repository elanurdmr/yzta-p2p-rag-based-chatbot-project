"use client";

// app/layout.tsx — uygulamanın ana iskelet dosyası
// Sider (sol panel), Header (üst bar) ve Content alanını yönetiyor.
// Sohbet geçmişi localStorage'da tutuluyor — backend restart'tan etkilenmiyor.

import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { BarsOutlined } from "@ant-design/icons";
import "./globals.css";
import { v4 as uuidv4 } from "uuid";
import { LayoutContext } from "./layout-context";
import SessionListItem from "./components/SessionListItem";
import AgentSelector from "./components/AgentSelector";
import SiderComponent from "./components/SiderComponent";

const { Header, Content } = Layout;

// Session: tek bir sohbet oturumunu temsil ediyor
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
  const day = 86_400_000; // ms cinsinden 1 gün
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
  // boş grupları filtrele — "Geçen Hafta" hiç oturum yoksa gösterilmesin
  return order
    .filter((l) => map.get(l)!.length > 0)
    .map((l) => ({ label: l, sessions: map.get(l)! }));
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("dokuman-asistani");
  // mounted kontrolü: localStorage sadece client'ta var, SSR'da çalışmıyor
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // sayfa yüklenince localStorage'daki geçmiş oturumları yükle
    try {
      const stored = localStorage.getItem("chatSessions");
      if (stored) setSessions(JSON.parse(stored));
    } catch {
      /* bozuk JSON gelirse sessizce geç */
    }
    // ilk yüklemede currentThreadId yoksa yeni bir UUID ata
    setCurrentThreadId((prev) => prev ?? uuidv4());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ChatComponent'ten gelen "add-session" custom event'ini dinle
  // window event kullanmak zorundayız çünkü ChatComponent farklı bir ağaçta
  useEffect(() => {
    const onAddSession = (event: Event) => {
      const { threadId, msg } = (event as CustomEvent).detail;
      const newSession: Session = {
        threadId: threadId || uuidv4(),
        name: (msg as string).substring(0, 60).replace(/\n/g, " "),
        lastUpdated: Date.now(),
      };
      setSessions((prev) => {
        const exists = prev.some((s) => s.threadId === newSession.threadId);
        const updated = exists ? prev : [newSession, ...prev];
        // localStorage'ı her güncellemede senkronize tut
        localStorage.setItem("chatSessions", JSON.stringify(updated));
        return updated;
      });
      setCurrentThreadId(newSession.threadId);
      window.history.pushState({}, "", `/chat/${newSession.threadId}`);
    };
    window.addEventListener("add-session", onAddSession);
    return () => window.removeEventListener("add-session", onAddSession);
  }, []);

  const handleDeleteSession = (delThreadId: string) => {
    // önce o oturuma ait mesajları temizle, sonra session listesinden çıkar
    localStorage.removeItem("chatMessages-" + delThreadId);

    const newSessions = sessions.filter((s) => s.threadId !== delThreadId);
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));

    if (newSessions.length > 0) {
      const next = newSessions[0].threadId;
      setCurrentThreadId(next);
      window.history.pushState({}, "", `/chat/${next}`);
    } else {
      // listedeki son oturum silindiyse yeni boş bir thread aç
      setCurrentThreadId(uuidv4());
      window.history.pushState({}, "", "/chat");
    }
  };

  const handlerNewChat = () => {
    setCurrentThreadId(uuidv4());
    window.history.pushState({}, "", "/chat");
  };

  const selectAgent = (value: string) => {
    // ajan değişince yeni sohbet başlatıyoruz — eski thread yeni ajanla karışmasın
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
            {/* mounted kontrolü olmadan localStorage'dan yüklenmiş sessions SSR'da undefined olabilir */}
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
                {/* ajan seçici header'ın sağ köşesinde */}
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
