'use client';

import { useRef, useState } from 'react';
import { ImageIcon, X, Save, RotateCcw, Trash2 } from 'lucide-react';
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
  const [image, setImage] = useState(null);
  const imageInputRef = useRef(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImage(event.target?.result || null);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleReset = () => {
    setForm({ ...EMPTY_FORM });
    setImage(null);
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
    setImage(null);
  };

  const handleDelete = () => {
    handleReset();
    setSaveStatus({ success: false, message: 'Finding deleted.' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

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
              className="w-fit px-3 h-8 text-sm bg-success text-white font-semibold rounded-full shadow-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              SAVE
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving}
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
          <div className="px-4 py-3 bg-trust-blue/40 border-b border-soft-border">
            <p className="text-xs font-bold text-midnight-ink tracking-widest uppercase">Image</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-soft-border rounded-2xl flex flex-col items-center justify-center w-full cursor-pointer hover:border-trust-blue hover:bg-trust-blue/5 transition-colors relative"
              style={{ minHeight: '320px' }}
            >
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {image ? (
                <>
                  <img src={image} alt="Finding" className="w-full h-full object-contain rounded-2xl p-3" style={{ maxHeight: '380px' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                    className="absolute top-3 right-3 bg-white border border-soft-border rounded-full p-1.5 shadow hover:bg-danger/10 hover:border-danger/40 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4 text-cool-gray" />
                  </button>
                </>
              ) : (
                <div className="text-center text-cool-gray select-none px-4 py-10">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-semibold">FINDING IMAGE</p>
                  <p className="text-xs text-cool-gray/60 mt-1">Click to upload</p>
                </div>
              )}
            </div>
            <button
              className="w-full border border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-md px-4 h-9 text-sm font-semibold transition-colors"
              onClick={() => imageInputRef.current?.click()}
            >
              {image ? 'Change Image' : 'Select Image'}
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
