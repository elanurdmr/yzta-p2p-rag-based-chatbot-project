// app/components/SiderComponent.tsx — sol kenar çubuğunun tüm içeriği
// Logo, yeni sohbet butonu, dosya yükleme ve sohbet geçmişi listesini barındırıyor.

import React from "react";
import { Layout, Menu } from "antd";
import NewChatButton from "./NewChatButton";
import DocumentUpload from "./DocumentUpload";
import { useLayoutContext } from "../layout-context";
import type { Session } from "../layout";

interface SiderComponentProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  sessions: Session[];
  handleDeleteSession: (threadId: string) => void;
  handlerNewChat: () => void;
  items: Array<{ key: string; label: React.ReactNode; type?: "group" }>;
  onSelectSession: (key: string) => void;
}

const { Sider } = Layout;

const SiderComponent: React.FC<SiderComponentProps> = ({
  collapsed,
  onCollapse,
  sessions,
  handleDeleteSession,
  handlerNewChat,
  items,
  onSelectSession,
}) => {
  const { currentThreadId } = useLayoutContext();
  const hasHistory = sessions.length > 0;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      className="flex flex-col"
      style={{ overflow: "hidden" }}
    >
      {/* Logo alanı — collapsed olduğunda gizleniyor */}
      {!collapsed && (
        <div className="flex flex-col items-center justify-center px-4 py-4 border-b border-gray-700">
          <span className="text-white text-base font-bold leading-tight text-center">
            Dokümanlarla
          </span>
          <span className="text-indigo-300 text-xs font-medium">Sohbet Et</span>
        </div>
      )}

      <NewChatButton collapsed={collapsed} onClick={handlerNewChat} />

      {/* dosya yükleyici collapsed modda gösterilmiyor — yer kalmaz */}
      {!collapsed && <DocumentUpload />}

      {!collapsed && hasHistory && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Sohbet Geçmişi
          </p>
        </div>
      )}

      {/* geçmiş listesi — max yükseklik var, taşarsa scroll oluyor */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "calc(100vh - 320px)",
          scrollbarWidth: "thin",
        }}
      >
        <Menu
          theme="dark"
          selectedKeys={currentThreadId ? [currentThreadId] : []}
          mode="inline"
          items={collapsed ? [] : items}  // collapsed'da listeyi boşalt, ikon gösterme
          onSelect={({ key }) => {
            // group başlıklarına ("group-Bugün" gibi) tıklanınca navigasyon olmasın
            if (!key.startsWith("group-")) onSelectSession(key);
          }}
          style={{ background: "transparent", border: "none" }}
        />
      </div>
    </Sider>
  );
};

export default SiderComponent;
