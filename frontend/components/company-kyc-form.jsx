'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X } from 'lucide-react';

export function CompanyKYCForm({ onClose }) {
  const [formData, setFormData] = useState({
    // Company Details
    companyName: '',
    businessType: '',
    gstNumber: '',
    panNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    // Authorized Person Details
    authorizedPersonName: '',
    designation: '',
    mobile: '',
    email: '',
    // Bank Details
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    // Documents
    gstCertificate: null,
    panCard: null,
    idProof: null,
    cancelledCheque: null,
    // Declaration
    declaration: false,
  });

  const [fileNames, setFileNames] = useState({
    gstCertificate: '',
    panCard: '',
    idProof: '',
    cancelledCheque: '',
  });

  const businessTypes = [
    'Manufacturing',
    'Trading',
    'Service Provider',
    'Retailer',
    'Wholesaler',
  ];

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [fieldName]: file,
      }));
      setFileNames(prev => ({
        ...prev,
        [fieldName]: file.name,
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, fieldName) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload({ target: { files: [file] } }, fieldName);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.companyName || !formData.businessType || !formData.gstNumber ||
        !formData.panNumber || !formData.addressLine1 || !formData.city || !formData.state ||
        !formData.pinCode || !formData.authorizedPersonName || !formData.designation ||
        !formData.mobile || !formData.email || !formData.accountName || !formData.bankName ||
        !formData.accountNumber || !formData.ifsc || !formData.declaration) {
      alert('Please fill all required fields and accept the declaration');
      return;
    }

    // Validate at least one document is uploaded
    if (!formData.gstCertificate && !formData.panCard &&
        !formData.idProof && !formData.cancelledCheque) {
      alert('Please upload at least one document');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.companyName.trim(),
          business_type: formData.businessType.trim(),
          gst_number: formData.gstNumber.trim(),
          pan_number: formData.panNumber.trim(),
          status: 'active',
          address_line1: formData.addressLine1.trim(),
          address_line2: formData.addressLine2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pin_code: formData.pinCode.trim(),
          authorized_person_name: formData.authorizedPersonName.trim(),
          designation: formData.designation.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          account_name: formData.accountName.trim(),
          bank_name: formData.bankName.trim(),
          account_number: formData.accountNumber.trim(),
          ifsc: formData.ifsc.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        alert(result?.error?.message || result?.message || 'Failed to submit KYC. Please try again.');
        return;
      }

      alert('Company KYC submitted successfully!');
      onClose();
    } catch {
      alert('Unable to submit KYC. Please check your connection and try again.');
    }
  };

  const labelClass = 'block text-xs font-semibold tracking-wide text-slate-600 uppercase mb-2';
  const fieldClass = 'w-full border-slate-300/80 bg-white/90 rounded-xl shadow-sm focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/20 transition-all';
  const sectionShellClass = 'bg-white border-b border-slate-200 p-5 md:p-6';

  const DocumentUploadCard = ({ label, field }) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, field)}
      className="border border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-trust-blue hover:bg-blue-50/50 transition-all cursor-pointer relative group bg-white"
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileUpload(e, field)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-100 to-slate-100 flex items-center justify-center border border-blue-200/60">
        <Upload className="w-6 h-6 text-deep-blue" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="text-xs text-cool-gray mt-1">Drag and drop or click to browse</p>
      <p className="text-xs text-cool-gray mt-2">PDF, JPG, PNG up to 5MB</p>
      {fileNames[field] && (
        <div className="mt-3 text-xs text-success font-semibold flex items-center justify-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-2">
          <span>✓</span>
          <span className="truncate">{fileNames[field]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-trust-blue to-trust-blue/90 text-white px-5 py-4 rounded-t-lg border-b border-white/10 flex items-center justify-between relative">
        <div className="flex-1" />
        <h1 className="text-lg font-bold tracking-widest uppercase">B2B Business KYC Form</h1>
        <div className="flex-1 flex justify-end">
          <button onClick={onClose} className="text-cool-gray hover:text-white transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-0">
        
        {/* Section 1: Company Details */}
        <section className={sectionShellClass}>
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base md:text-lg font-bold text-midnight-ink">1. Company Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className={labelClass}>Company Name *</Label>
              <Input
                name="companyName"
                value={formData.companyName}
                onChange={handleFormChange}
                placeholder="Enter company name"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Business Type *</Label>
              <Select value={formData.businessType} onValueChange={(value) => handleSelectChange('businessType', value)}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>GST Number (GSTIN) *</Label>
              <Input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleFormChange}
                placeholder="15 digit GST number"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>PAN Number *</Label>
              <Input
                name="panNumber"
                value={formData.panNumber}
                onChange={handleFormChange}
                placeholder="10 digit PAN"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Registered Address *</h3>
            <div className="space-y-4">
              <div>
                <Label className={labelClass}>Address Line 1</Label>
                <Input
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleFormChange}
                  placeholder="Street address"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Address Line 2</Label>
                <Input
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleFormChange}
                  placeholder="Apartment, suite, etc."
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className={labelClass}>City</Label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="City"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>State</Label>
                  <Select value={formData.state} onValueChange={(value) => handleSelectChange('state', value)}>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelClass}>PIN Code</Label>
                  <Input
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleFormChange}
                    placeholder="6 digit PIN code"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Authorized Person Details */}
        <section className={sectionShellClass}>
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base md:text-lg font-bold text-midnight-ink">2. Authorized Person Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className={labelClass}>Full Name *</Label>
              <Input
                name="authorizedPersonName"
                value={formData.authorizedPersonName}
                onChange={handleFormChange}
                placeholder="Full name"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Designation *</Label>
              <Input
                name="designation"
                value={formData.designation}
                onChange={handleFormChange}
                placeholder="Director, Manager, etc."
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Mobile Number *</Label>
              <Input
                name="mobile"
                value={formData.mobile}
                onChange={handleFormChange}
                placeholder="10 digit mobile number"
                type="tel"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Email Address *</Label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="email@example.com"
                type="email"
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Bank Details */}
        <section className={sectionShellClass}>
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base md:text-lg font-bold text-midnight-ink">3. Bank Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className={labelClass}>Account Name *</Label>
              <Input
                name="accountName"
                value={formData.accountName}
                onChange={handleFormChange}
                placeholder="Account holder name"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Bank Name *</Label>
              <Input
                name="bankName"
                value={formData.bankName}
                onChange={handleFormChange}
                placeholder="Bank name"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Account Number *</Label>
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleFormChange}
                placeholder="Account number"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>IFSC Code *</Label>
              <Input
                name="ifsc"
                value={formData.ifsc}
                onChange={handleFormChange}
                placeholder="IFSC code"
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Documents Upload */}
        <section className={sectionShellClass}>
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base md:text-lg font-bold text-midnight-ink">4. Documents Upload</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocumentUploadCard label="GST Certificate" field="gstCertificate" />
            <DocumentUploadCard label="PAN Card" field="panCard" />
            <DocumentUploadCard label="Authorized Person ID Proof" field="idProof" />
            <DocumentUploadCard label="Cancelled Cheque / Bank Proof" field="cancelledCheque" />
          </div>
        </section>

        {/* Section 5: Declaration */}
        <section className={sectionShellClass}>
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base md:text-lg font-bold text-midnight-ink">5. Declaration</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/60 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <Checkbox
                id="declaration"
                checked={formData.declaration}
                onCheckedChange={(checked) => handleCheckboxChange('declaration', checked)}
                className="mt-0.5"
              />
              <Label htmlFor="declaration" className="text-sm text-slate-700 font-medium cursor-pointer leading-relaxed">
                I confirm that the information provided above is accurate and I am authorized to represent this business.
              </Label>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3">
          <Button
            onClick={() => {
              const stored = localStorage.getItem('form_drafts')
              const all = stored ? JSON.parse(stored) : {}
              const section = 'KYC Form'
              const existing = all[section] || []
              const draft = {
                ...formData,
                id: `draft_kyc_${Date.now()}`,
                title: formData.companyName || 'KYC Draft',
                savedAt: new Date().toLocaleString(),
              }
              all[section] = [draft, ...existing]
              localStorage.setItem('form_drafts', JSON.stringify(all))
              alert('KYC draft saved!')
            }}
            className="flex-1 h-10 rounded-lg bg-trust-blue hover:bg-trust-blue/90 text-white font-semibold text-sm tracking-wide"
          >
            Save as Draft
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-10 rounded-lg bg-success hover:bg-success-dark text-white font-bold text-sm tracking-widest uppercase"
          >
            Submit KYC
          </Button>
        </div>
      </div>
    </div>
  );
}
