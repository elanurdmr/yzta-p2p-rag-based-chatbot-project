import React from "react";
import { DeleteOutlined } from "@ant-design/icons";
import type { Session } from "../layout";

interface SessionListItemProps {
  session: Session;
  onDelete: (threadId: string) => void;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ session, onDelete }) => {
  return (
    <div className="group flex items-center gap-1 w-full min-w-0">
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 text-sm">
        {session.name}
      </span>
      <button
        title="Sohbeti sil"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.threadId);
        }}
        className="
          shrink-0 flex items-center justify-center w-5 h-5 rounded
          text-gray-500 hover:text-red-400
          opacity-0 group-hover:opacity-100
          transition-all duration-150
          bg-transparent border-0 cursor-pointer p-0
        "
      >
        <DeleteOutlined style={{ fontSize: 12 }} />
      </button>
    </div>
  );
};

export default SessionListItem;
