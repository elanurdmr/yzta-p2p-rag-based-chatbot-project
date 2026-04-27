// app/components/NewChatButton.tsx — sol paneldeki "Yeni Sohbet" butonu
// collapsed olduğunda sadece + ikonu gösteriyor, açıkken "YENİ SOHBET" yazısı da çıkıyor.

import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface NewChatButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ collapsed, onClick }) => {
  return (
    <Button
      type="primary"
      onClick={onClick}
      icon={<PlusOutlined />}
      // margin'i inline style ile veriyoruz çünkü Tailwind collapsed durumu dinamik halledemiyor
      style={{ margin: "16px", width: collapsed ? "40px" : "calc(100% - 32px)" }}
      shape={collapsed ? "circle" : "round"}
    >
      {!collapsed && "YENİ SOHBET"}
    </Button>
  );
};

export default NewChatButton;
