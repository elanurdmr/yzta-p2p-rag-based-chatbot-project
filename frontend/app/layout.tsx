"use client";

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

interface Session {
  threadId: string;
  name: string;
  lastUpdated: number;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Hydration güvenli başlangıç: SSR'de boş dizi, tarayıcıda localStorage'dan yükle
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("dokuman-asistani");
  const [mounted, setMounted] = useState(false);

  // Tarayıcıya mount olduktan sonra localStorage'ı oku (Hydration hatası önlenir)
  // İlk açılışta boş oturum bile olsa bir thread_id ön-atanır → belge yüklemeleri
  // doğru etiketlenir.
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("chatSessions");
      if (stored) {
        setSessions(JSON.parse(stored));
      } else {
        // Hiç oturum yok → temiz başlangıç için thread_id ön-ata
        setCurrentThreadId(uuidv4());
      }
    } catch {
      setCurrentThreadId(uuidv4());
    }
  }, []);

  // Yeni oturum ekle event'ini dinle
  useEffect(() => {
    const addSession = (event: Event) => {
      const { threadId, msg } = (event as CustomEvent).detail;
      handleAddSession(threadId, msg);
    };
    window.addEventListener("add-session", addSession);
    return () => window.removeEventListener("add-session", addSession);
  }, [sessions]);  // sessions değişince listener'ı güncelle

  const handleAddSession = (newThreadId: string, startMsg: string) => {
    const tid = newThreadId || uuidv4();
    const msg = startMsg || `Sohbet ${new Date().toLocaleTimeString("tr-TR")}`;
    const newSession: Session = {
      threadId: tid,
      name: msg.substring(0, 28),
      lastUpdated: Date.now(),
    };

    const updated = [...sessions, newSession];
    setSessions(updated);
    setCurrentThreadId(tid);
    localStorage.setItem("chatSessions", JSON.stringify(updated));
    window.history.pushState({}, "", `/chat/${tid}`);
  };

  const handleDeleteSession = (delThreadId: string) => {
    const newSessions = sessions.filter((s) => s.threadId !== delThreadId);
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));
    localStorage.removeItem("chatMessages-" + delThreadId);

    if (newSessions.length > 0) {
      const last = [...newSessions].reverse()[0].threadId;
      setCurrentThreadId(last);
      window.history.pushState({}, "", `/chat/${last}`);
    } else {
      // Oturum kalmadı → yeni sohbet için UUID ön-ata
      setCurrentThreadId(uuidv4());
      window.history.pushState({}, "", "/chat");
    }
  };

  const handlerNewChat = () => {
    // Yeni sohbet için hemen UUID ata — kullanıcı belge yüklemeden önce ID'si hazır olsun
    setCurrentThreadId(uuidv4());
    window.history.pushState({}, "", "/chat");
  };

  const selectAgent = (value: string) => {
    setAgentId(value);
    handlerNewChat();
  };

  const items = [...sessions].reverse().map((session) => ({
    key: session.threadId,
    label: (
      <SessionListItem session={session} onDelete={handleDeleteSession} />
    ),
  }));

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
