import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
}

/** Browser PDF chrome without download / print / edit tools. */
function viewOnlyPdfSrc(url: string): string {
  const hash = "toolbar=0&navpanes=0&scrollbar=1&view=FitH";
  if (!url) return url;
  if (url.includes("#")) {
    const [base, existing] = url.split("#", 2);
    return `${base}#${hash}&${existing}`;
  }
  return `${url}#${hash}`;
}

export default function DocumentViewer({ fileUrl, fileName, mimeType }: DocumentViewerProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) {
      setType(null);
      return;
    }

    if (mimeType) {
      if (mimeType.includes("pdf")) {
        setType("pdf");
        return;
      }
      if (
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType.includes("msword") ||
        mimeType.includes("officedocument")
      ) {
        setType("word");
        return;
      }
      if (mimeType.includes("video")) {
        setType("video");
        return;
      }
      if (mimeType.includes("image")) {
        setType("image");
        return;
      }
      if (mimeType.includes("audio")) {
        setType("audio");
        return;
      }
      if (mimeType.includes("text/plain")) {
        setType("text");
        return;
      }
    }

    const url = fileUrl.toLowerCase().split("?")[0];
    const name = fileName?.toLowerCase() || "";

    if (url.endsWith(".pdf") || name.endsWith(".pdf") || url.includes(".pdf")) {
      setType("pdf");
    } else if (
      url.endsWith(".doc") ||
      url.endsWith(".docx") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx") ||
      url.includes(".docx") ||
      url.includes(".doc")
    ) {
      setType("word");
    } else if (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".ogg") ||
      name.endsWith(".mp4") ||
      name.endsWith(".webm") ||
      name.endsWith(".ogg")
    ) {
      setType("video");
    } else if (
      url.endsWith(".mp3") ||
      url.endsWith(".wav") ||
      url.endsWith(".m4a") ||
      name.endsWith(".mp3") ||
      name.endsWith(".wav") ||
      name.endsWith(".m4a")
    ) {
      setType("audio");
    } else if (
      url.endsWith(".jpg") ||
      url.endsWith(".jpeg") ||
      url.endsWith(".png") ||
      url.endsWith(".gif") ||
      url.endsWith(".webp") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".gif") ||
      name.endsWith(".webp")
    ) {
      setType("image");
    } else if (url.endsWith(".txt") || name.endsWith(".txt")) {
      setType("text");
    } else if (fileUrl.toLowerCase().includes("youtube.com") || fileUrl.toLowerCase().includes("youtu.be")) {
      setType("youtube");
    } else {
      setType("unknown");
    }
  }, [fileUrl, fileName, mimeType]);

  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const isBlobUrl = fileUrl.startsWith("blob:");
  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault();

  const unsupportedPreview = (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg border border-gray-200">
      <FileText className="w-16 h-16 text-slate-400 mb-4" />
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{fileName || t("documentViewer.document", "Document")}</h4>
      <p className="text-gray-600 text-center max-w-md">
        {t(
          "documentViewer.previewUnavailable",
          "Aperçu en consultation non disponible pour ce format. Le téléchargement est désactivé."
        )}
      </p>
    </div>
  );

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ height: "100%", width: "100%", flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
      onContextMenu={blockContextMenu}
    >
      {type === "pdf" && (
        <iframe
          src={viewOnlyPdfSrc(fileUrl)}
          className="w-full h-full border-0"
          title={fileName || "PDF"}
          style={{ height: "100%", width: "100%", flex: "1 1 auto", minHeight: 0, border: "none" }}
        />
      )}

      {type === "word" &&
        (isBlobUrl ? (
          unsupportedPreview
        ) : (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            className="w-full h-full border-0 rounded-lg shadow"
            title={fileName || "Word"}
            style={{ height: "100%", width: "100%", flex: "1 1 auto", minHeight: 0 }}
            sandbox="allow-scripts allow-same-origin"
          />
        ))}

      {type === "video" && (
        <div className="w-full h-full flex-1 min-h-0" style={{ height: "100%", width: "100%" }}>
          <video
            src={fileUrl}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            className="w-full h-full rounded-lg shadow"
            style={{ height: "100%", width: "100%" }}
            onContextMenu={blockContextMenu}
          >
            {t("documentViewer.videoUnsupported", "Lecture vidéo non supportée")}
          </video>
        </div>
      )}

      {type === "audio" && (
        <div className="flex flex-1 items-center justify-center p-8">
          <audio
            src={fileUrl}
            controls
            controlsList="nodownload noplaybackrate"
            className="w-full max-w-xl"
            onContextMenu={blockContextMenu}
          />
        </div>
      )}

      {type === "image" && (
        <div className="w-full h-full flex-1 flex items-center justify-center min-h-0">
          <img
            src={fileUrl}
            alt={fileName || "Image"}
            className="max-w-full max-h-full rounded-lg shadow object-contain"
            style={{ maxHeight: "100%", width: "auto" }}
            draggable={false}
            onContextMenu={blockContextMenu}
          />
        </div>
      )}

      {type === "text" && (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={fileName || "Text"}
          style={{ height: "100%", width: "100%", flex: "1 1 auto", minHeight: 0 }}
          sandbox=""
        />
      )}

      {type === "youtube" && (
        <div className="w-full h-full flex-1 min-h-0" style={{ height: "100%", width: "100%" }}>
          {(() => {
            const videoId = getYouTubeId(fileUrl);
            if (videoId) {
              return (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full h-full border-0 rounded-lg shadow"
                  title="YouTube Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ height: "100%", width: "100%" }}
                />
              );
            }
            return (
              <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-16 h-16 text-red-500 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("documentViewer.invalidYoutube", "URL YouTube invalide")}
                </h4>
                <p className="text-gray-600 text-center">
                  {t("documentViewer.cannotEmbed", "Impossible d’intégrer cette vidéo dans HARX.")}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {type === "unknown" && unsupportedPreview}

      {!type && (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-600">{t("documentViewer.loading", "Chargement du document…")}</p>
        </div>
      )}
    </div>
  );
}
