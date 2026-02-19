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
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';

export function CompanyKYCForm({ onClose }) {
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    gstNumber: '',
    panNumber: '',
    address: '',
    authorizedPersonName: '',
    designation: '',
    mobile: '',
    email: '',
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    gstCertificate: null,
    panCard: null,
    idProof: null,
    cancelledCheque: null,
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      declaration: checked,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
    if (!formData.companyName || !formData.businessType || !formData.gstNumber || 
        !formData.panNumber || !formData.address || !formData.authorizedPersonName || 
        !formData.designation || !formData.mobile || !formData.email || 
        !formData.accountName || !formData.bankName || !formData.accountNumber || 
        !formData.ifsc || !formData.declaration) {
      alert('Please fill all required fields and accept the declaration');
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
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-lg">
        <h2 className="text-2xl font-bold">Company KYC Verification</h2>
        <p className="text-indigo-100 text-sm mt-1">Complete B2B verification in 4 simple steps</p>
      </div>

      <div className="p-6 space-y-6 bg-white">
        {/* Section 1: Company Details */}
        <div className="border-l-4 border-indigo-600 pl-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
            <h3 className="text-lg font-semibold text-gray-800">Company Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-2">Company Name *</Label>
              <Input
                name="companyName"
                value={formData.companyName}
                onChange={handleFormChange}
                placeholder="Enter company name"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Business Type *</Label>
              <Select value={formData.businessType} onValueChange={(value) => handleSelectChange('businessType', value)}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">GST Number *</Label>
              <Input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleFormChange}
                placeholder="15 digit GST number"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">PAN Number *</Label>
              <Input
                name="panNumber"
                value={formData.panNumber}
                onChange={handleFormChange}
                placeholder="10 digit PAN"
                className="border-gray-300"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold mb-2">Registered Address *</Label>
              <Textarea
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                placeholder="Full registered address"
                className="border-gray-300 min-h-20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Authorized Person */}
        <div className="border-l-4 border-blue-600 pl-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
            <h3 className="text-lg font-semibold text-gray-800">Authorized Person</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-2">Name *</Label>
              <Input
                name="authorizedPersonName"
                value={formData.authorizedPersonName}
                onChange={handleFormChange}
                placeholder="Full name"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Designation *</Label>
              <Input
                name="designation"
                value={formData.designation}
                onChange={handleFormChange}
                placeholder="e.g., Director, Manager"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Mobile Number *</Label>
              <Input
                name="mobile"
                value={formData.mobile}
                onChange={handleFormChange}
                placeholder="10 digit mobile number"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Email Address *</Label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="email@example.com"
                className="border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bank Details */}
        <div className="border-l-4 border-green-600 pl-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
            <h3 className="text-lg font-semibold text-gray-800">Bank Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-2">Account Name *</Label>
              <Input
                name="accountName"
                value={formData.accountName}
                onChange={handleFormChange}
                placeholder="Account holder name"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Bank Name *</Label>
              <Input
                name="bankName"
                value={formData.bankName}
                onChange={handleFormChange}
                placeholder="Bank name"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">Account Number *</Label>
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleFormChange}
                placeholder="Account number"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2">IFSC Code *</Label>
              <Input
                name="ifsc"
                value={formData.ifsc}
                onChange={handleFormChange}
                placeholder="IFSC code"
                className="border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Document Upload */}
        <div className="border-l-4 border-purple-600 pl-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
            <h3 className="text-lg font-semibold text-gray-800">Document Upload</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DocumentUploadCard label="GST Certificate" field="gstCertificate" />
            <DocumentUploadCard label="PAN Card" field="panCard" />
            <DocumentUploadCard label="ID Proof" field="idProof" />
            <DocumentUploadCard label="Cancelled Cheque" field="cancelledCheque" />
          </div>
        </div>

        {/* Declaration */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Checkbox
              id="declaration"
              checked={formData.declaration}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="declaration" className="text-sm text-gray-700 font-medium cursor-pointer">
                I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.
              </Label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            Submit KYC
          </Button>
        </div>
      </div>
    </div>
  );
}
