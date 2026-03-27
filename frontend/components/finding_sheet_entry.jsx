'use client';

import { useRef, useState } from 'react';
import { ImageIcon, X, Save, RotateCcw, Trash2, Plus, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import GlobalSearchBar from '@/components/global-search-bar';

const EMPTY_FORM = {
  findingCode: '',
  dieNumber: '',
  size: '',
  quantity: '',
  weight: '',
};

export default function FindingSheetEntry() {
  const [images, setImages] = useState([]);
  const imageInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result || null);
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      setImages((prev) => [...prev, ...results.filter(Boolean)]);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx) => {
    dragIndexRef.current = idx;
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      dragIndexRef.current = idx;
      return next;
    });
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleReset = () => {
    setForm({ ...EMPTY_FORM });
    setImages([]);
    setSaveStatus(null);
  };

  const handleSave = () => {
    if (!form.findingCode.trim()) {
      setSaveStatus({ success: false, message: 'Finding Code is required.' });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setIsSaving(true);
    setSaveStatus({ success: true, message: 'Finding saved successfully.' });
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 3000);
    setForm({ ...EMPTY_FORM });
    setImages([]);
  };

  const handleDelete = () => {
    handleReset();
    setSaveStatus({ success: false, message: 'Finding deleted.' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const primaryImage = images[0] || null;

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">FINDING SHEET</h1>
          </div>
          <GlobalSearchBar />
          <div className="flex items-center gap-1.5 shrink-0">
            <DateTimeStamp className="text-xs" />
            <button
              onClick={handleSave}
              disabled={isSaving}
              suppressHydrationWarning
              className="w-fit px-3 h-8 text-sm bg-success text-white font-semibold rounded-full shadow-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              SAVE
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving}
              suppressHydrationWarning
              className="w-fit px-3 h-8 text-sm bg-danger text-white font-semibold rounded-full shadow-sm hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              DELETE
            </button>
            {saveStatus && (
              <div className={`text-sm px-2 py-1 rounded-md ${saveStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
                {saveStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-page body split into left image panel + right fields panel */}
      <div className="flex flex-col lg:flex-row flex-1 pt-[52px] min-h-screen">

        {/* Left — Image panel */}
        <div className="lg:w-[340px] shrink-0 bg-white border-r border-soft-border flex flex-col">
          <div className="px-4 py-3 bg-trust-blue/40 border-b border-soft-border flex items-center justify-between">
            <p className="text-xs font-bold text-midnight-ink tracking-widest uppercase">Images</p>
            {images.length > 0 && (
              <span className="text-xs text-cool-gray">{images.length} photo{images.length > 1 ? 's' : ''} · drag to reorder</span>
            )}
          </div>
          <div className="flex-1 flex flex-col p-4 gap-3">
            {/* Primary image preview */}
            <div
              onClick={() => !primaryImage && imageInputRef.current?.click()}
              className={`border-2 border-dashed border-soft-border rounded-2xl flex flex-col items-center justify-center w-full relative overflow-hidden transition-colors ${!primaryImage ? 'cursor-pointer hover:border-trust-blue hover:bg-trust-blue/5' : ''}`}
              style={{ minHeight: '240px' }}
            >
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
              {primaryImage ? (
                <>
                  <img src={primaryImage} alt="Primary finding" className="w-full h-full object-contain p-3" style={{ maxHeight: '260px' }} />
                  <span className="absolute top-2 left-2 bg-trust-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-white" /> PRIMARY
                  </span>
                </>
              ) : (
                <div className="text-center text-cool-gray select-none px-4 py-8">
                  <ImageIcon className="w-14 h-14 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">FINDING IMAGES</p>
                  <p className="text-xs text-cool-gray/60 mt-1">Click to upload</p>
                </div>
              )}
            </div>

            {/* Thumbnail strip — drag to reorder */}
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${idx === 0 ? 'border-trust-blue shadow-md' : 'border-soft-border hover:border-trust-blue/50'}`}
                    title={idx === 0 ? 'Primary image' : 'Drag to make primary'}
                  >
                    <img src={src} alt={`Finding ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-trust-blue/90 text-white text-[8px] font-bold text-center py-0.5">PRIMARY</span>
                    )}
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 hover:bg-danger/10 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3 text-cool-gray" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add images button */}
            <button
              className="w-full border border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-md px-4 h-9 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              suppressHydrationWarning
              onClick={() => imageInputRef.current?.click()}
            >
              <Plus className="w-4 h-4" />
              {images.length === 0 ? 'Select Images' : 'Add More Images'}
            </button>
          </div>
        </div>

        {/* Right — Fields panel */}
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 bg-trust-blue/40 border-b border-soft-border">
            <p className="text-xs font-bold text-midnight-ink tracking-widest uppercase">Finding Details</p>
          </div>

          <div className="flex-1 p-6 md:p-10 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="FINDING CODE" placeholder="e.g. FC-001" value={form.findingCode} onChange={(v) => setField('findingCode', v)} required />
              <Field label="DIE NUMBER" placeholder="e.g. D-45" value={form.dieNumber} onChange={(v) => setField('dieNumber', v)} />
              <Field label="SIZE" placeholder="e.g. 10mm" value={form.size} onChange={(v) => setField('size', v)} />
              <Field label="QUANTITY" placeholder="e.g. 100" value={form.quantity} onChange={(v) => setField('quantity', v)} />
              <Field label="WEIGHT" placeholder="e.g. 5.2g" value={form.weight} onChange={(v) => setField('weight', v)} />
            </div>

            {/* Divider */}
            <div className="border-t border-soft-border" />

            {/* Reset */}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={handleReset}
                suppressHydrationWarning
                className="w-fit px-3 h-8 text-sm border border-midnight-ink text-midnight-ink rounded-full flex items-center gap-1 hover:bg-midnight-ink/5 font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, required }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-slate-text tracking-widest uppercase">
        {label}{required && <span className="text-danger ml-1">*</span>}
      </label>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-base border-soft-border focus:border-trust-blue px-4"
      />
    </div>
  );
}
