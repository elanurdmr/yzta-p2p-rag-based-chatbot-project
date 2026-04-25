import React from "react";
import { Select } from "antd";
import { FileSearchOutlined, FileTextOutlined } from "@ant-design/icons";

interface AgentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      className="ml-2 mr-4 w-48"
      onChange={onChange}
      options={[
        {
          value: "dokuman-asistani",
          label: (
            <span className="flex items-center gap-1.5">
              <FileSearchOutlined className="text-blue-500" />
              Doküman Asistanı
            </span>
          ),
        },
        {
          value: "ozetleme-asistani",
          label: (
            <span className="flex items-center gap-1.5">
              <FileTextOutlined className="text-indigo-500" />
              Özetleme Asistanı
            </span>
          ),
        },
      ]}
    />
  );
};

export default AgentSelector;
