'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Printer } from 'lucide-react'
import { PrintJobCardModal } from '@/components/print-job-card-modal'
import { useSheetPermissions } from '@/hooks/use-sheet-permissions'

const STATUS_OPTIONS = ['created', 'assigned', 'in_progress', 'completed', 'cancelled']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const URGENCY_OPTIONS = ['normal', 'express', 'asap']

export default function JobDetail() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id
  const { canExport } = useSheetPermissions('master-job-sheet')

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    if (jobId) {
      loadJob()
    }
  }, [jobId])

  async function loadJob() {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        setError(result?.message || 'Failed to load job')
        return
      }

      const jobData = result?.data || null
      setJob(jobData)
      setFormData(jobData || {})
    } catch (err) {
      setError('Error loading job: ' + (err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        setError(result?.message || 'Failed to update job')
        return
      }

      setJob(result?.data || formData)
      setIsEditing(false)
      alert('Job updated successfully')
    } catch (err) {
      setError('Error updating job: ' + (err.message || 'Unknown error'))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cloud-gray p-6">
        <div className="text-center text-cool-gray">Loading job...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-cloud-gray p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => router.push('/frontend/jobs')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error || 'Job not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cloud-gray p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/frontend/jobs')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-midnight-ink">{job.title}</h1>
            <div className="flex gap-2">
              {canExport && (
              <Button
                onClick={() => setIsPrintModalOpen(true)}
                variant="outline"
                className="border-soft-border"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Card
              </Button>
              )}
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-trust-blue hover:bg-deep-blue text-white"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-soft-border p-6 space-y-6">
          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Status</label>
              {isEditing ? (
                <Select value={formData.status || 'created'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="border-soft-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {String(status).replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-base text-midnight-ink font-semibold">
                  {String(job.status).replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>

            {job.job_type && (
              <div>
                <label className="block text-sm font-semibold text-midnight-ink mb-2">Work Category</label>
                <p className="text-base text-midnight-ink">{job.job_type}</p>
              </div>
            )}
          </div>

          {/* Assigned To and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Assigned To</label>
              {isEditing ? (
                <Input
                  value={formData.assignee_name || ''}
                  onChange={(e) => setFormData({ ...formData, assignee_name: e.target.value })}
                  className="border-soft-border"
                />
              ) : (
                <p className="text-base text-midnight-ink">{job.assignee_name || job.assignee || 'Unassigned'}</p>
              )}
            </div>

            {job.location && (
              <div>
                <label className="block text-sm font-semibold text-midnight-ink mb-2">Location</label>
                {isEditing ? (
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="border-soft-border"
                  />
                ) : (
                  <p className="text-base text-midnight-ink">{job.location}</p>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          {(job.start_date || job.due_date) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.start_date && (
                <div>
                  <label className="block text-sm font-semibold text-midnight-ink mb-2">Start Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="border-soft-border"
                    />
                  ) : (
                    <p className="text-base text-midnight-ink">{new Date(job.start_date).toLocaleDateString()}</p>
                  )}
                </div>
              )}
              {job.due_date && (
                <div>
                  <label className="block text-sm font-semibold text-midnight-ink mb-2">Due Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.due_date || ''}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="border-soft-border"
                    />
                  ) : (
                    <p className="text-base text-midnight-ink">{new Date(job.due_date).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Priority and Urgency */}
          {(job.priority || job.urgency) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.priority && (
                <div>
                  <label className="block text-sm font-semibold text-midnight-ink mb-2">Priority</label>
                  {isEditing ? (
                    <Select value={formData.priority || 'medium'} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger className="border-soft-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {String(p).charAt(0).toUpperCase() + String(p).slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base text-midnight-ink">{String(job.priority).charAt(0).toUpperCase() + String(job.priority).slice(1)}</p>
                  )}
                </div>
              )}
              {job.urgency && (
                <div>
                  <label className="block text-sm font-semibold text-midnight-ink mb-2">Urgency</label>
                  {isEditing ? (
                    <Select value={formData.urgency || 'normal'} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                      <SelectTrigger className="border-soft-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {String(u).charAt(0).toUpperCase() + String(u).slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base text-midnight-ink">{String(job.urgency).charAt(0).toUpperCase() + String(job.urgency).slice(1)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cost */}
          {job.estimated_cost && (
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Estimated Cost</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.estimated_cost || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="border-soft-border"
                />
              ) : (
                <p className="text-base text-midnight-ink">₹{parseFloat(job.estimated_cost).toLocaleString('en-IN')}</p>
              )}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Description</label>
              {isEditing ? (
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="border-soft-border"
                />
              ) : (
                <p className="text-base text-midnight-ink whitespace-pre-wrap">{job.description}</p>
              )}
            </div>
          )}

          {/* Workers */}
          {job.workers && job.workers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Workers Assigned</label>
              <div className="space-y-2">
                {job.workers.map((worker, i) => (
                  <div key={i} className="bg-cloud-gray p-3 rounded-lg text-sm">
                    <p className="font-semibold text-midnight-ink">{worker.name}</p>
                    {worker.role && <p className="text-cool-gray">Role: {worker.role}</p>}
                    {worker.contact && <p className="text-cool-gray">Contact: {worker.contact}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {job.materials && job.materials.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Materials Required</label>
              <div className="space-y-2">
                {job.materials.map((material, i) => (
                  <div key={i} className="bg-cloud-gray p-3 rounded-lg text-sm">
                    <p className="font-semibold text-midnight-ink">
                      {material.name}
                      {material.quantity && ` (${material.quantity} ${material.unit || ''})`}
                    </p>
                    {material.notes && <p className="text-cool-gray">{material.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {job.special_instructions && (
            <div>
              <label className="block text-sm font-semibold text-midnight-ink mb-2">Special Instructions</label>
              {isEditing ? (
                <Textarea
                  value={formData.special_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  rows={2}
                  className="border-soft-border bg-yellow-50"
                />
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-midnight-ink whitespace-pre-wrap">
                  {job.special_instructions}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          {isEditing && (
            <>
              <Button onClick={handleSave} className="bg-success hover:bg-success text-white">
                Save Changes
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="border-soft-border">
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print Modal */}
      <PrintJobCardModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={job}
      />
    </div>
  )
}
