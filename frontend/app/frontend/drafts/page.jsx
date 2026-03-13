'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateJobModal } from '@/components/create-job-modal'
import { QuickEnrollModal } from '@/components/quick-enroll-modal'
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page'
import { CompanyKYCForm } from '@/components/company-kyc-form'

const DRAFTS_STORAGE_KEY = 'form_drafts'

const SECTIONS = ['Create Job', 'Create Order', 'Enroll Workforce', 'Quick Enroll', 'KYC Form']

const getAddressText = (address) => {
  if (!address) return ''
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ')
}

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

const TABLE_CONFIG = {
  'Create Job': [
    { key: 'title', label: 'Title', getValue: (draft) => draft.title },
    { key: 'date', label: 'Date', getValue: (draft) => draft.date },
    { key: 'scheduleFuture', label: 'Schedule', getValue: (draft) => draft.scheduleFuture },
    { key: 'voucherType', label: 'Voucher Type', getValue: (draft) => draft.voucherType },
    { key: 'voucherNo', label: 'Voucher No.', getValue: (draft) => draft.voucherNo },
    { key: 'issuedTo', label: 'Issued To', getValue: (draft) => draft.issuedTo },
    { key: 'workType', label: 'Work Type', getValue: (draft) => draft.workType },
    { key: 'deptFrom', label: 'Dept From', getValue: (draft) => draft.deptFrom },
    { key: 'deptTo', label: 'Dept To', getValue: (draft) => draft.deptTo },
    { key: 'rows', label: 'Item Rows', getValue: (draft) => draft.rows },
    { key: 'stoneRows', label: 'Stone Rows', getValue: (draft) => draft.stoneRows },
    { key: 'dieWeightRows', label: 'Die/Weight Rows', getValue: (draft) => draft.dieWeightRows },
    { key: 'noteByIssuer', label: 'Note', getValue: (draft) => draft.noteByIssuer },
    { key: 'savedAt', label: 'Saved At', getValue: (draft) => draft.savedAt },
  ],
  'Create Order': [
    { key: 'title', label: 'Title', getValue: (draft) => draft.title },
    { key: 'customerName', label: 'Customer', getValue: (draft) => draft.selectedCustomer?.companyName || draft.selectedCustomer?.authorizedPersonName || draft.customerSearch },
    { key: 'itemsCount', label: 'Items', getValue: (draft) => draft.itemsCount },
    { key: 'total', label: 'Total', getValue: (draft) => draft.total ? `INR ${draft.total}` : '' },
    { key: 'notes', label: 'Notes', getValue: (draft) => draft.notes },
    { key: 'savedAt', label: 'Saved At', getValue: (draft) => draft.savedAt },
  ],
  'Enroll Workforce': [
    { key: 'title', label: 'Title', getValue: (draft) => draft.title },
    { key: 'fullName', label: 'Full Name', getValue: (draft) => draft.fullName },
    { key: 'dob', label: 'DOB', getValue: (draft) => draft.dob },
    { key: 'gender', label: 'Gender', getValue: (draft) => draft.gender },
    { key: 'email', label: 'Email', getValue: (draft) => draft.email },
    { key: 'contact', label: 'Contact', getValue: (draft) => draft.contact },
    { key: 'whatsapp', label: 'WhatsApp', getValue: (draft) => draft.whatsapp },
    { key: 'currentLocation', label: 'Current Location', getValue: (draft) => draft.currentLocation },
    { key: 'gstNumber', label: 'GST Number', getValue: (draft) => draft.gstNumber },
    { key: 'firstLang', label: 'First Language', getValue: (draft) => draft.firstLang },
    { key: 'secondLang', label: 'Second Language', getValue: (draft) => draft.secondLang },
    { key: 'sameAsCurrent', label: 'Same As Current', getValue: (draft) => draft.sameAsCurrent },
    { key: 'currentAddress', label: 'Current Address', getValue: (draft) => getAddressText(draft.currentAddress) },
    { key: 'permanentAddress', label: 'Permanent Address', getValue: (draft) => getAddressText(draft.permanentAddress) },
    { key: 'notes', label: 'Notes', getValue: (draft) => draft.notes },
    { key: 'savedAt', label: 'Saved At', getValue: (draft) => draft.savedAt },
  ],
  'KYC Form': [
    { key: 'title', label: 'Title', getValue: (draft) => draft.title },
    { key: 'companyName', label: 'Company Name', getValue: (draft) => draft.companyName },
    { key: 'businessType', label: 'Business Type', getValue: (draft) => draft.businessType },
    { key: 'gstNumber', label: 'GST Number', getValue: (draft) => draft.gstNumber },
    { key: 'authorizedPersonName', label: 'Authorized Person', getValue: (draft) => draft.authorizedPersonName },
    { key: 'mobile', label: 'Mobile', getValue: (draft) => draft.mobile },
    { key: 'email', label: 'Email', getValue: (draft) => draft.email },
    { key: 'bankName', label: 'Bank Name', getValue: (draft) => draft.bankName },
    { key: 'savedAt', label: 'Saved At', getValue: (draft) => draft.savedAt },
  ],
  'Quick Enroll': [
    { key: 'title', label: 'Title', getValue: (draft) => draft.title },
    { key: 'firstName', label: 'First Name', getValue: (draft) => draft.firstName },
    { key: 'lastName', label: 'Last Name', getValue: (draft) => draft.lastName },
    { key: 'countryCode', label: 'Code', getValue: (draft) => draft.countryCode },
    { key: 'contactNumber', label: 'Contact Number', getValue: (draft) => draft.contactNumber },
    { key: 'location', label: 'Location', getValue: (draft) => draft.location },
    { key: 'department', label: 'Department', getValue: (draft) => draft.department },
    { key: 'type', label: 'Type', getValue: (draft) => draft.type },
    { key: 'remarks', label: 'Remarks', getValue: (draft) => draft.remarks },
    { key: 'photoFileName', label: 'Photo File', getValue: (draft) => draft.photoFileName },
    { key: 'savedAt', label: 'Saved At', getValue: (draft) => draft.savedAt },
  ],
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState({})
  const [activeSection, setActiveSection] = useState(null)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [isQuickEnrollOpen, setIsQuickEnrollOpen] = useState(false)
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false)
  const [workforceDraftData, setWorkforceDraftData] = useState(null)
  const [isKYCOpen, setIsKYCOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (!stored) {
      setDrafts({})
      return
    }

    try {
      const parsed = JSON.parse(stored)
      setDrafts(parsed)
    } catch (error) {
      console.error('Failed to parse drafts:', error)
      setDrafts({})
    }
  }, [])

  const totalDrafts = useMemo(
    () => Object.values(drafts).reduce((sum, sectionDrafts) => sum + sectionDrafts.length, 0),
    [drafts]
  )

  const activeDrafts = activeSection ? (drafts[activeSection] || []) : []
  const activeColumns = activeSection ? (TABLE_CONFIG[activeSection] || []) : []

  const clearAllDrafts = () => {
    localStorage.removeItem(DRAFTS_STORAGE_KEY)
    setDrafts({})
  }

  const handleContinueDraft = (section, draft) => {
    if (section === 'Create Order') {
      sessionStorage.setItem('create_order_draft_to_load', JSON.stringify(draft))
      router.push('/orders/create-job')
      return
    }

    if (section === 'Enroll Workforce') {
      setWorkforceDraftData(draft)
      setIsEnrollWorkforceOpen(true)
      return
    }

    if (section === 'KYC Form') {
      setIsKYCOpen(true)
      return
    }
    window.dispatchEvent(new CustomEvent('draftLoad', { detail: { section, data: draft } }))
    if (section === 'Create Job') setIsCreateJobOpen(true)
    if (section === 'Quick Enroll') setIsQuickEnrollOpen(true)
  }

  return (
    <main className="min-h-screen bg-cloud-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-midnight-ink">Drafts</h1>
            <p className="text-sm text-cool-gray mt-1">Saved drafts grouped by section</p>
          </div>
          <div className="flex items-center gap-2">
            {totalDrafts > 0 && (
              <Button
                onClick={clearAllDrafts}
                variant="outline"
                className="text-danger border-danger/30 hover:bg-danger/10"
              >
                Clear All Drafts
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/home">Back to Home</Link>
            </Button>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {SECTIONS.map((section) => {
            const count = (drafts[section] || []).length
            const isActive = activeSection === section

            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`text-left rounded-xl border bg-white p-5 transition ${
                  isActive
                    ? 'border-soft-border shadow-sm'
                    : 'border-soft-border hover:border-soft-border hover:shadow-md'
                }`}
              >
                <h2 className="text-base font-semibold text-midnight-ink">{section}</h2>
                <p className="text-sm text-cool-gray mt-2">{count} saved draft{count === 1 ? '' : 's'}</p>
              </button>
            )
          })}
        </section>

        <CreateJobModal
          open={isCreateJobOpen}
          onOpenChange={setIsCreateJobOpen}
        />

        <QuickEnrollModal
          open={isQuickEnrollOpen}
          onOpenChange={setIsQuickEnrollOpen}
        />

        {isEnrollWorkforceOpen && workforceDraftData && (
          <EnrolWorkforceForm
            open={isEnrollWorkforceOpen}
            onClose={() => { setIsEnrollWorkforceOpen(false); setWorkforceDraftData(null) }}
            draftData={workforceDraftData}
          />
        )}

        {isKYCOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl">
              <CompanyKYCForm onClose={() => setIsKYCOpen(false)} />
            </div>
          </div>
        )}

        {activeSection && (
          <section className="rounded-xl border border-soft-border bg-white p-5">
            <h3 className="text-base font-semibold text-midnight-ink mb-4">{activeSection} Drafts</h3>

            {activeDrafts.length === 0 ? (
              <p className="text-sm text-cool-gray">No drafts available in this section.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      {activeColumns.map((column) => (
                        <th
                          key={column.key}
                          className="text-left text-sm font-semibold text-slate-text px-3 py-2 border border-soft-border"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDrafts.map((draft) => (
                      <tr key={draft.id} className="hover:bg-cloud-gray">
                        {activeColumns.map((column) => (
                          <td
                            key={`${draft.id}-${column.key}`}
                            className="text-sm text-slate-text px-3 py-2 border border-soft-border align-top"
                          >
                            {column.key === 'title' ? (
                              <button
                                onClick={() => handleContinueDraft(activeSection, draft)}
                                className="text-left text-deep-blue hover:text-deep-blue hover:underline font-medium"
                              >
                                {formatValue(column.getValue(draft)) || 'Continue Draft'}
                              </button>
                            ) : (
                              formatValue(column.getValue(draft))
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
