import React from 'react';
import { Dropdown, Button } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface SessionListItemProps {
  session: { threadId: string; name: string; lastUpdated: number };
  onDelete: (threadId: string) => void;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ session, onDelete }) => {
  const menuItems: MenuProps['items'] = [
    {
      key: 'delete',
      label: 'SİL',
      onClick: () => onDelete(session.threadId),
    },
  ];

  return (
    <div className="flex items-center gap-2 w-full min-w-0 flex-1 overflow-visible">
      <span className="flex-1 overflow-hidden text-clip whitespace-nowrap min-w-0">
        {session.name}
      </span>
      <Dropdown
        className="shrink-0 w-6 ml-2 flex-none"
        menu={{ items: menuItems }}
        trigger={['click']}
      >
        <Button
          icon={<EllipsisOutlined />}
          shape="circle"
          size="small"
          style={{ flexShrink: 0, backgroundColor: 'transparent', color: '#fff' }}
        />
      </Dropdown>
    </div>
  );
};

export default SessionListItem;
