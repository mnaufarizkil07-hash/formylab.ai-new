"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Download,
  Copy,
  Check,
  AlertCircle,
  Cloud,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GoogleDocArtifact } from "./chatNoteUtils";
import {
  GoogleDocsClientError,
  copyRichHtmlForGoogleDocs,
  createGoogleDocInDrive,
  downloadWordReadyDocFile,
  isGoogleDriveConnected,
  isGoogleDriveOAuthConfigured,
  subscribeGoogleDriveAuth,
} from "../lib/googleDocsClient";

interface GoogleDocCardProps {
  doc: GoogleDocArtifact;
  onDocUpdated?: (updatedDoc: GoogleDocArtifact) => void;
}

export default function GoogleDocCard({
  doc,
  onDocUpdated,
}: GoogleDocCardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMissingClientId, setIsMissingClientId] = useState(false);
  const [copiedRich, setCopiedRich] = useState(false);
  const [downloadedDoc, setDownloadedDoc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const autoCreateAttemptedRef = useRef(false);
  const onDocUpdatedRef = useRef(onDocUpdated);

  useEffect(() => {
    onDocUpdatedRef.current = onDocUpdated;
  }, [onDocUpdated]);

  useEffect(() => {
    queueMicrotask(() => {
      setDriveConnected(isGoogleDriveConnected());
      setOauthConfigured(isGoogleDriveOAuthConfigured());
    });
    return subscribeGoogleDriveAuth((snapshot) => {
      setDriveConnected(snapshot.isConnected);
      setOauthConfigured(snapshot.isConfigured);
    });
  }, []);

  const executeCreateInDrive = useCallback(
    async (interactiveAuth: boolean) => {
      if (isCreating || doc.docUrl) return;
      setIsCreating(true);
      setErrorMessage("");
      setIsMissingClientId(false);

      try {
        const created = await createGoogleDocInDrive({
          title: doc.title,
          markdownContent: doc.markdownContent,
          interactiveAuth,
        });

        onDocUpdatedRef.current?.({
          ...doc,
          title: created.title,
          docId: created.id,
          docUrl: created.url,
          status: "created",
        });
      } catch (err: unknown) {
        if (err instanceof GoogleDocsClientError) {
          if (err.code === "MISSING_CLIENT_ID") {
            setIsMissingClientId(true);
            setErrorMessage(
              "Untuk simpan otomatis langsung ke Google Drive, tambahkan NEXT_PUBLIC_GOOGLE_CLIENT_ID di environment. Anda tetap bisa langsung unduh .doc atau salin format siap paste ke Google Docs."
            );
          } else {
            setErrorMessage(err.message);
          }
        } else {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Gagal membuat file Google Docs di Google Drive."
          );
        }
      } finally {
        setIsCreating(false);
      }
    },
    [doc, isCreating]
  );

  // Auto-create seamlessly if Google Drive is ALREADY connected or becomes connected via OAuth
  useEffect(() => {
    if (
      doc.docUrl ||
      doc.status === "created" ||
      autoCreateAttemptedRef.current
    ) {
      return;
    }
    if (driveConnected || isGoogleDriveConnected()) {
      autoCreateAttemptedRef.current = true;
      queueMicrotask(() => {
        void executeCreateInDrive(false);
      });
    }
  }, [doc.docUrl, doc.status, driveConnected, executeCreateInDrive]);

  const handleCopyRichDocs = async () => {
    const ok = await copyRichHtmlForGoogleDocs(doc.title, doc.markdownContent);
    if (ok) {
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2000);
    }
  };

  const handleDownloadDoc = () => {
    downloadWordReadyDocFile(doc.title, doc.markdownContent);
    setDownloadedDoc(true);
    setTimeout(() => setDownloadedDoc(false), 2000);
  };

  const hasTable = /\|.+\|\s*\n\s*\|[\s:-]+\|/m.test(doc.markdownContent);
  const isCreated = Boolean(doc.docUrl);

  return (
    <article
      className="w-full rounded-[20px] bg-white/80 backdrop-blur-xl backdrop-saturate-[160%] border border-[#0B2B26]/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),0_14px_34px_-18px_rgba(11,43,38,0.16)] overflow-hidden"
      aria-label={`Google Docs: ${doc.title}`}
    >
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#eaf7f4]/90 via-white/85 to-[#f3fbf9]/90 border-b border-[#0B2B26]/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 border ${
              isCreated
                ? "bg-[#0E807E]/12 border-[#0E807E]/25 text-[#0E807E]"
                : "bg-[#f4fbf8] border-[#0B2B26]/12 text-[#0E807E]"
            }`}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : isCreated ? (
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <FileText className="w-4 h-4" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-medium text-[#0B2B26] tracking-[-0.01em] truncate">
              {doc.title}
            </h3>
            <p className="text-[11px] text-[#2E524C] truncate mt-0.5">
              {isCreating
                ? "Membuat Google Docs di Drive..."
                : isCreated
                  ? `Tersimpan di Google Drive · ${hasTable ? "Paragraf & Tabel" : "Dokumen R&D"}`
                  : `Draft siap Google Docs · ${hasTable ? "Termasuk Tabel Terformat" : "Format R&D"}`}
            </p>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[0.04em] text-[#0E807E] bg-[#0E807E]/10 border border-[#0E807E]/20">
          <Cloud className="w-3 h-3" aria-hidden="true" />
          <span>Google Docs</span>
        </span>
      </div>

      {/* Body: Status / Action Controls */}
      <div className="px-5 py-4 space-y-3">
        {/* Primary CTA Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isCreated && doc.docUrl ? (
            <a
              href={doc.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass-primary min-h-[44px] px-4 py-2 rounded-full inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[#0B2B26] cursor-pointer"
            >
              <span>Buka Google Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            </a>
          ) : isCreating ? (
            <div className="min-h-[44px] px-4 py-2 rounded-full inline-flex items-center gap-2 text-xs font-medium text-[#0E807E] bg-[#eefaf6] border border-[#0E807E]/25">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>Membuat Google Docs di Drive...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void executeCreateInDrive(true)}
              className="btn-glass-primary min-h-[44px] px-4 py-2 rounded-full inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[#0B2B26] cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
              <span>
                {driveConnected
                  ? "Simpan ke Google Docs"
                  : "Hubungkan Google Drive & Simpan Sekarang"}
              </span>
            </button>
          )}

          {/* Instant Safe Fallback Actions (.doc & Rich HTML Copy) */}
          <button
            type="button"
            onClick={handleDownloadDoc}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#0B2B26] bg-white/75 hover:bg-white border border-[#0B2B26]/12 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all cursor-pointer active:scale-[0.98]"
            title="Unduh file .doc terformat rapi lengkap dengan tabel untuk dibuka di Google Docs"
          >
            {downloadedDoc ? (
              <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            )}
            <span>
              {downloadedDoc
                ? "Terunduh (.doc)"
                : "Unduh File Siap Google Docs (.doc)"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyRichDocs}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#2E524C] hover:text-[#0B2B26] bg-white/65 hover:bg-white border border-[#0B2B26]/12 backdrop-blur-md transition-all cursor-pointer active:scale-[0.98]"
            title="Salin format kaya HTML siap tempel langsung ke Google Docs"
          >
            {copiedRich ? (
              <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            )}
            <span>
              {copiedRich
                ? "Format Tersalin"
                : "Salin Format Siap Paste ke Docs"}
            </span>
          </button>
        </div>

        {/* Friendly Notice when Client ID is unconfigured or OAuth encounters an error */}
        {(!oauthConfigured || errorMessage) && !isCreated && (
          <div className="rounded-[12px] px-3.5 py-2.5 bg-[#f4fbf8] border border-[#0E807E]/25 text-xs text-[#2E524C] flex items-start gap-2 leading-relaxed">
            <AlertCircle
              className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              {errorMessage ||
                "Untuk simpan otomatis langsung ke Google Drive dibutuhkan NEXT_PUBLIC_GOOGLE_CLIENT_ID di environment. Gunakan tombol Unduh (.doc) atau Salin Format Siap Paste ke Docs di atas sebagai opsi instan."}
              {isMissingClientId && (
                <code className="ml-1.5 px-1.5 py-0.5 rounded bg-[#0E807E]/10 text-[#0B2B26] font-mono text-[11px]">
                  NEXT_PUBLIC_GOOGLE_CLIENT_ID
                </code>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Content Preview */}
        <div className="pt-1 border-t border-[#0B2B26]/8">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2E524C] hover:text-[#0B2B26] transition-colors cursor-pointer"
          >
            {showPreview ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            )}
            <span>
              {showPreview
                ? "Sembunyikan pratinjau isi dokumen"
                : "Lihat pratinjau isi dokumen"}
            </span>
          </button>

          {showPreview && (
            <pre className="mt-2 p-3 rounded-[12px] bg-[#f7fbf9] border border-[#0B2B26]/10 text-[11.5px] text-[#2E524C] font-mono whitespace-pre-wrap break-words max-h-56 overflow-y-auto leading-relaxed">
              {doc.markdownContent}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}
