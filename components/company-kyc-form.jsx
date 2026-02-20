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
import { Upload } from 'lucide-react';

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

  const handleSubmit = () => {
    // Validate all required fields
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

    console.log('KYC Form Submitted:', formData);
    alert('Company KYC submitted successfully!');
    onClose();
  };

  const DocumentUploadCard = ({ label, field, placeholder }) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, field)}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer relative group"
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileUpload(e, field)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mt-1">Drag or browse</p>
      <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (Max 5MB)</p>
      {fileNames[field] && (
        <div className="mt-2 text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
          <span>✓</span>
          <span className="truncate">{fileNames[field]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-8 rounded-t-lg">
        <h1 className="text-3xl font-bold">B2B BUSINESS KYC FORM</h1>
        <p className="text-indigo-100 text-sm mt-2">Complete your business verification in 5 steps</p>
      </div>

      <div className="p-8 bg-white space-y-8 rounded-b-lg">
        
        {/* Section 1: Company Details */}
        <div>
          <div className="border-b-2 border-gray-300 pb-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">1. COMPANY DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Company Name *</Label>
              <Input
                name="companyName"
                value={formData.companyName}
                onChange={handleFormChange}
                placeholder="Enter company name"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Business Type *</Label>
              <Select value={formData.businessType} onValueChange={(value) => handleSelectChange('businessType', value)}>
                <SelectTrigger className="border-gray-300">
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
              <Label className="block text-sm font-semibold text-gray-700 mb-2">GST Number (GSTIN) *</Label>
              <Input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleFormChange}
                placeholder="15 digit GST number"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">PAN Number *</Label>
              <Input
                name="panNumber"
                value={formData.panNumber}
                onChange={handleFormChange}
                placeholder="10 digit PAN"
                className="w-full border-gray-300"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Registered Address *</h3>
            <div className="space-y-4">
              <div>
                <Label className="block text-xs font-semibold text-gray-600 mb-2">Address Line 1</Label>
                <Input
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleFormChange}
                  placeholder="Street address"
                  className="w-full border-gray-300"
                />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-gray-600 mb-2">Address Line 2</Label>
                <Input
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleFormChange}
                  placeholder="Apartment, suite, etc."
                  className="w-full border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="block text-xs font-semibold text-gray-600 mb-2">City</Label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="City"
                    className="w-full border-gray-300"
                  />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-gray-600 mb-2">State</Label>
                  <Select value={formData.state} onValueChange={(value) => handleSelectChange('state', value)}>
                    <SelectTrigger className="border-gray-300">
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
                  <Label className="block text-xs font-semibold text-gray-600 mb-2">PIN Code</Label>
                  <Input
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleFormChange}
                    placeholder="6 digit PIN code"
                    className="w-full border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Authorized Person Details */}
        <div>
          <div className="border-b-2 border-gray-300 pb-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">2. AUTHORIZED PERSON DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</Label>
              <Input
                name="authorizedPersonName"
                value={formData.authorizedPersonName}
                onChange={handleFormChange}
                placeholder="Full name"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Designation *</Label>
              <Input
                name="designation"
                value={formData.designation}
                onChange={handleFormChange}
                placeholder="Director, Manager, etc."
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number *</Label>
              <Input
                name="mobile"
                value={formData.mobile}
                onChange={handleFormChange}
                placeholder="10 digit mobile number"
                type="tel"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</Label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="email@example.com"
                type="email"
                className="w-full border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bank Details */}
        <div>
          <div className="border-b-2 border-gray-300 pb-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">3. BANK DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Account Name *</Label>
              <Input
                name="accountName"
                value={formData.accountName}
                onChange={handleFormChange}
                placeholder="Account holder name"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name *</Label>
              <Input
                name="bankName"
                value={formData.bankName}
                onChange={handleFormChange}
                placeholder="Bank name"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">Account Number *</Label>
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleFormChange}
                placeholder="Account number"
                className="w-full border-gray-300"
              />
            </div>
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-2">IFSC Code *</Label>
              <Input
                name="ifsc"
                value={formData.ifsc}
                onChange={handleFormChange}
                placeholder="IFSC code"
                className="w-full border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Documents Upload */}
        <div>
          <div className="border-b-2 border-gray-300 pb-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">4. DOCUMENTS UPLOAD</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <DocumentUploadCard label="GST Certificate" field="gstCertificate" />
            <DocumentUploadCard label="PAN Card" field="panCard" />
            <DocumentUploadCard label="Authorized Person ID Proof" field="idProof" />
            <DocumentUploadCard label="Cancelled Cheque / Bank Proof" field="cancelledCheque" />
          </div>
        </div>

        {/* Section 5: Declaration */}
        <div>
          <div className="border-b-2 border-gray-300 pb-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">5. DECLARATION</h2>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
            <div className="flex items-start gap-4">
              <Checkbox
                id="declaration"
                checked={formData.declaration}
                onCheckedChange={(checked) => handleCheckboxChange('declaration', checked)}
                className="mt-1"
              />
              <Label htmlFor="declaration" className="text-sm text-gray-700 font-medium cursor-pointer leading-relaxed">
                I confirm that the information provided above is accurate and I am authorized to represent this business.
              </Label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-8"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
          >
            Submit KYC
          </Button>
        </div>
      </div>
    </div>
  );
}
