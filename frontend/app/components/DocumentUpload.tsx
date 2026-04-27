"use client";

// app/components/DocumentUpload.tsx — sol paneldeki dosya yükleme bileşeni
// Yüklenen dosyayı POST /upload/document'e gönderiyor.
// thread_id ile belgeyi aktif oturuma bağlıyor — başka oturumlar bu belgeyi göremez.

import React, { useState } from "react";
import { Upload, message, Typography, Progress } from "antd";
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useLayoutContext } from "../layout-context";

const { Text } = Typography;

interface UploadedFile {
  filename: string;
  chunks: number;
  status: "done" | "error";
}

// küçük yardımcı — dosya uzantısına göre ikon seç
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined className="text-red-400 text-sm" />;
  if (ext === "docx" || ext === "doc") return <FileWordOutlined className="text-blue-400 text-sm" />;
  return <FileTextOutlined className="text-gray-400 text-sm" />;
}

const DocumentUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // uploadedFiles sadece bu session içinde tutuluyor — sayfa yenilenince sıfırlanır
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { currentThreadId } = useLayoutContext();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append("file", file);
    // thread_id göndermezsen belgeler "global" olarak indekslenir — tüm oturumlar görür
    if (currentThreadId) formData.append("thread_id", currentThreadId);

    try {
      setProgress(50);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/document`,
        { method: "POST", body: formData }
      );

      setProgress(90);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Bilinmeyen hata" }));
        throw new Error(err.detail || "Yükleme başarısız");
      }

      const result = await res.json();
      setUploadedFiles((prev) => [
        { filename: result.filename, chunks: result.chunks, status: "done" },
        ...prev,
      ]);
      // chunk sayısını göster — kullanıcı "neden bu kadar uzun sürdü" sorusunu anlar
      message.success(`"${result.filename}" yüklendi · ${result.chunks} parça`);
    } catch (err: any) {
      message.error(err.message || "Dosya yüklenirken hata oluştu.");
    } finally {
      setProgress(0);
      setUploading(false);
    }
  };

  return (
    <div className="px-3 pb-3">
      <Text className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Doküman Yükle
      </Text>

      {/* Ant Design Upload.Dragger — sürükle-bırak + tıklama destekli */}
      <Upload.Dragger
        accept=".pdf,.docx,.doc,.txt"
        showUploadList={false}
        beforeUpload={(file) => {
          // beforeUpload false döndürünce Ant Design kendi upload mekanizmasını çalıştırmıyor
          // biz kendi handleUpload'umuzu çağırıyoruz
          handleUpload(file);
          return false;
        }}
        multiple={false}
        disabled={uploading}
        className="!rounded-xl !border-dashed !border-gray-600 !bg-transparent hover:!border-blue-400 transition-colors"
      >
        <div className="py-3 px-2 text-center">
          <UploadOutlined className={`text-lg ${uploading ? "text-gray-500" : "text-gray-400"}`} />
          <p className="text-xs text-gray-400 mt-1 leading-tight">
            {uploading ? "Yükleniyor..." : "PDF · DOCX · DOC · TXT"}
          </p>
        </div>
      </Upload.Dragger>

      {uploading && (
        <Progress
          percent={progress}
          size="small"
          showInfo={false}
          strokeColor="#6366f1"
          className="mt-2"
        />
      )}

      {/* yüklenen dosyaların listesi — session boyunca göster */}
      {uploadedFiles.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1.5"
            >
              <FileIcon name={f.filename} />
              <span className="flex-1 text-xs text-gray-300 truncate" title={f.filename}>
                {f.filename}
              </span>
              {/* chunk sayısı = indekslenen parça sayısı */}
              <span className="text-xs text-green-400 shrink-0 flex items-center gap-1">
                <CheckCircleOutlined />
                {f.chunks}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
