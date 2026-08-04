"use client";

import dynamic from "next/dynamic";
import i18next from "i18next";
import { useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { PowerPointViewerProps, ToolbarActionId } from "pptx-react-viewer";
import { keyToLabel, translationsEn } from "pptx-react-viewer/i18n";

const PowerPointViewer = dynamic(
  () => import("pptx-react-viewer").then((module) => module.PowerPointViewer),
  { ssr: false, loading: () => <div className="pptx-viewer-status">載入 PowerPoint viewer…</div> },
);

const pptxI18n = i18next.createInstance();
void pptxI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: translationsEn } },
  interpolation: { escapeValue: false },
  parseMissingKeyHandler: (key) => keyToLabel(key),
});

type ViewerProps = Pick<PowerPointViewerProps, "canEdit" | "onActiveSlideChange" | "onContentChange"> & {
  sourceUrl: string;
  fileName: string;
  hiddenActions?: ToolbarActionId[];
};

export function PptxViewer({ sourceUrl, fileName, canEdit = false, onActiveSlideChange, onContentChange, hiddenActions = ["export", "file"] }: ViewerProps) {
  const [content, setContent] = useState<Uint8Array | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setContent(null);
    setError("");
    void fetch(sourceUrl, { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "無法讀取 PPTX 原始檔");
        return new Uint8Array(await response.arrayBuffer());
      })
      .then(setContent)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "無法讀取 PPTX 原始檔");
      });
    return () => controller.abort();
  }, [sourceUrl]);

  if (error) return <div className="pptx-viewer-status error">{error}</div>;
  if (!content) return <div className="pptx-viewer-status">讀取 PowerPoint 中…</div>;

  return (
    <I18nextProvider i18n={pptxI18n}>
      <PowerPointViewer
        content={content}
        fileName={fileName}
        canEdit={canEdit}
        hiddenActions={hiddenActions}
        onActiveSlideChange={onActiveSlideChange}
        onContentChange={onContentChange}
        className="pptx-viewer-component"
      />
    </I18nextProvider>
  );
}
