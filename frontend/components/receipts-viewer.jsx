'use client';
import { useRef, useState } from 'react';

const C = {
  blue: '#2563eb', blueBg: '#eff6ff',
  muted: '#64748b', border: '#e2e8f0',
  text: '#0f172a', slateBg: '#f8fafc',
  red: '#dc2626', green: '#059669',
};

const ALL_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.xlsb,.ods,.csv,.ppt,.pptx,.odp,.txt,.rtf,.odt';

// Normalize backend absolute media URLs → relative paths (Next.js /media proxy)
function normalizeUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.pathname;
  } catch {}
  return url;
}

function fileIcon(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['jpg','jpeg','png','gif','webp','bmp','svg','avif'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['xls','xlsx','xlsm','xlsb','ods','csv'].includes(ext)) return '📊';
  if (['doc','docx','odt','rtf'].includes(ext)) return '📝';
  if (['ppt','pptx','odp'].includes(ext)) return '📊';
  if (['txt','log','md'].includes(ext)) return '📋';
  return '📎';
}

/* ── Shared Receipts Viewer Modal ──────────────────────────────
   Props:
     title        – modal heading
     receipts     – array of { id, file, filename } OR single string URL
     uploadUrl    – POST endpoint to upload new receipts (optional)
     onUploadDone – callback after successful upload
     onClose      – close handler
*/
export function ReceiptsViewerModal({ title, receipts = [], uploadUrl, onUploadDone, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [localItems, setLocalItems] = useState(null);
  const fileRef = useRef(null);

  // Normalise receipts to array of { url, filename }
  const baseItems = Array.isArray(receipts)
    ? receipts.map(r => ({
        url: normalizeUrl(typeof r === 'string' ? r : r.file),
        filename: typeof r === 'string' ? r.split('/').pop() : (r.filename || String(r.file || '').split('/').pop() || 'file'),
        id: r.id,
      }))
    : receipts
    ? [{ url: normalizeUrl(receipts), filename: String(receipts).split('/').pop() }]
    : [];

  const items = localItems ?? baseItems;

  const handleUpload = async (files) => {
    if (!uploadUrl || !files?.length) return;
    setUploading(true); setUploadErr('');
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('receipts', f));
      const res = await fetch(uploadUrl, { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setUploadErr(data?.message || 'Upload failed. Please try again.');
      } else {
        if (data.data && Array.isArray(data.data)) {
          const newItems = data.data.map(r => ({
            url: normalizeUrl(r.file),
            filename: r.filename || String(r.file).split('/').pop(),
            id: r.id,
          }));
          setLocalItems([...items, ...newItems]);
        }
        if (onUploadDone) onUploadDone();
      }
    } catch { setUploadErr('Network error. Please check your connection.'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
      />

      {/* Modal panel */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{ pointerEvents: 'all', background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 70px rgba(0,0,0,0.25)' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>📎 {title || 'Receipts & Invoices'}</h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: C.muted }}>
                {items.length} file{items.length !== 1 ? 's' : ''} attached
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: C.muted, fontWeight: 700 }}
            >
              ✕
            </button>
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>No files attached yet</p>
                {uploadUrl && <p style={{ margin: '6px 0 0', fontSize: 12 }}>Use the button below to upload receipts, invoices, or any document.</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.slateBg, borderRadius: 10, border: `1px solid ${C.border}` }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(item.filename)}</span>
                    <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {/* View — opens in new tab directly */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', background: C.blue, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
                      >
                        👁 View
                      </a>
                      {/* Download */}
                      <a
                        href={item.url}
                        download={item.filename}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', background: '#fff', color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                      >
                        ⬇
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload section */}
          {uploadUrl && (
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0, background: C.slateBg, borderRadius: '0 0 16px 16px' }}>
              {uploadErr && (
                <div style={{ marginBottom: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: C.red, fontWeight: 600 }}>
                  ⚠️ {uploadErr}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ALL_TYPES}
                multiple
                style={{ display: 'none' }}
                onChange={e => handleUpload(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '100%', padding: '10px 0',
                  border: `1.5px dashed ${uploading ? '#d1d5db' : C.blue}`,
                  borderRadius: 9,
                  background: uploading ? '#f9fafb' : C.blueBg,
                  color: uploading ? C.muted : C.blue,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {uploading ? '⏳ Uploading…' : '+ Upload Receipt / Invoice / Document'}
              </button>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: C.muted, textAlign: 'center' }}>
                Supports: Images, PDF, Word, Excel, PowerPoint, CSV, Text • Multiple files allowed
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Inline Receipt Badge ──────────────────────────────────────
   Props:
     receipts    – array of receipt objects OR single URL string
     title       – modal title
     uploadUrl   – optional upload endpoint (only shown inside modal)
     onUpload    – callback after upload
     accentColor – badge color
*/
export function ReceiptsBadge({ receipts, title, uploadUrl, onUpload, accentColor = C.blue }) {
  const [open, setOpen] = useState(false);

  const count = Array.isArray(receipts)
    ? receipts.length
    : receipts
    ? 1
    : 0;

  // No receipts and no upload action → show dash
  if (count === 0 && !uploadUrl) {
    return <span style={{ color: C.muted, fontSize: 13 }}>—</span>;
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title={count > 0 ? `${count} file${count !== 1 ? 's' : ''} — click to view` : 'Click to upload files'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px',
          background: count > 0 ? accentColor + '15' : C.slateBg,
          color: count > 0 ? accentColor : C.muted,
          border: `1px solid ${count > 0 ? accentColor + '55' : C.border}`,
          borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        📎 {count > 0 ? `${count} ${count === 1 ? 'file' : 'files'}` : '+ Attach'}
      </button>

      {open && (
        <ReceiptsViewerModal
          title={title}
          receipts={receipts}
          uploadUrl={uploadUrl}
          onUploadDone={() => { if (onUpload) onUpload(); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default ReceiptsViewerModal;
