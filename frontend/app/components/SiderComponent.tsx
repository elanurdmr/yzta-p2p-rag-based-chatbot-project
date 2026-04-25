import React from "react";
import { Layout, Menu } from "antd";
import NewChatButton from "./NewChatButton";
import DocumentUpload from "./DocumentUpload";
import { useLayoutContext } from "../layout-context";

interface SiderComponentProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  sessions: Array<{ threadId: string; name: string; lastUpdated: number }>;
  handleDeleteSession: (threadId: string) => void;
  handlerNewChat: () => void;
  items: Array<{ key: string; label: React.ReactNode }>;
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

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={220}
      className="flex flex-col"
    >
      {/* Logo */}
      {!collapsed && (
        <div className="flex flex-col items-center justify-center px-4 py-4 border-b border-gray-700">
          <span className="text-white text-base font-bold leading-tight text-center">
            📄 Dokümanlarla
          </span>
          <span className="text-indigo-300 text-xs font-medium">Sohbet Et</span>
        </div>
      )}

      {/* Yeni sohbet */}
      <NewChatButton collapsed={collapsed} onClick={handlerNewChat} />

      {/* Dosya yükleme */}
      {!collapsed && <DocumentUpload />}

      {/* Oturum listesi */}
      {!collapsed && items.length > 0 && (
        <div className="px-3 pb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Geçmiş
          </p>
        </div>
      )}
      <Menu
        theme="dark"
        className="flex-1 overflow-y-auto max-h-[calc(100vh-360px)]"
        selectedKeys={currentThreadId ? [currentThreadId] : []}
        mode="inline"
        items={items}
        onSelect={({ key }) => onSelectSession(key)}
      />
    </Sider>
  );
};

export default SiderComponent;
