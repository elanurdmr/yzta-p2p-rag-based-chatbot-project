"use client";

import React, { useState } from "react";
import { Tag, Tooltip } from "antd";
import {
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  LinkOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { Source } from "../types/chat.types";

interface SourcePanelProps {
  sources: Source[];
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined className="text-red-400" />;
  if (ext === "docx" || ext === "doc") return <FileWordOutlined className="text-blue-400" />;
  return <FileTextOutlined className="text-gray-400" />;
}

function scoreColor(score: number): string {
  if (score >= 0.75) return "success";
  if (score >= 0.5) return "processing";
  return "default";
}

const SourcePanel: React.FC<SourcePanelProps> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const visible = expanded ? sources : sources.slice(0, 3);

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
        <LinkOutlined className="text-blue-500 text-xs" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Kaynaklar ({sources.length})
        </span>
      </div>

      {/* Kaynak kartları */}
      <div className="divide-y divide-gray-100">
        {visible.map((src) => (
          <div key={`${src.file}-${src.index}`} className="px-3 py-2 flex items-start gap-2">
            <FileIcon filename={src.file} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">
                  {src.file}
                </span>
                {src.page !== null && (
                  <span className="text-xs text-gray-400">s.{src.page}</span>
                )}
                <Tag color={scoreColor(src.score)} className="text-xs leading-none py-0 m-0">
                  %{Math.round(src.score * 100)}
                </Tag>
              </div>
              {src.preview && (
                <Tooltip title={src.preview} placement="topLeft">
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{src.preview}</p>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Daha fazla / az göster */}
      {sources.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-500 hover:bg-blue-50 transition-colors"
        >
          {expanded ? (
            <><UpOutlined /> Daha az göster</>
          ) : (
            <><DownOutlined /> {sources.length - 3} kaynak daha</>
          )}
        </button>
      )}
    </div>
  );
};

export default SourcePanel;
