'use client'

import { useEffect, useState } from 'react'
import { Search, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import MasterNavigationDrawer from '@/components/master_navigation_drawer'
import GlobalSearchBar from '@/components/global-search-bar'
import DateTimeStamp from '@/components/date-time-stamp'
import DeletionHistoryDrawer from '@/components/deletion-history-drawer'
import Link from 'next/link'

const STATUS_COLORS = {
  created: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-cyan-100 text-cyan-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const PRIORITY_COLORS = {
  low: 'text-cool-gray',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-danger',
}

export default function JobsDashboard() {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/jobs', { cache: 'no-store' })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        setError(result?.message || 'Failed to load jobs')
        return
      }

      const jobsData = Array.isArray(result?.data) ? result.data : result?.data?.results || []
      setJobs(jobsData)
    } catch (err) {
      setError('Error loading jobs: ' + (err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let filtered = jobs

    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter)
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(search) ||
          job.job_type?.toLowerCase().includes(search) ||
          job.assignee_name?.toLowerCase().includes(search) ||
          (job.assignee && job.assignee !== 'Unassigned')
      )
    }

    setFilteredJobs(filtered)
  }, [jobs, statusFilter, searchTerm])

  function getStatusIcon(status) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-trust-blue" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-danger" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  return (
    <div className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="bg-white border-b border-soft-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">JOBS DASHBOARD</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-soft-border pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-soft-border rounded-lg bg-white text-midnight-ink"
            >
              <option value="all">All Status</option>
              <option value="created">Created</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button
              onClick={loadJobs}
              variant="outline"
              className="border-soft-border"
            >
              Refresh
            </Button>
          </div>

          <div className="text-sm text-cool-gray">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-cool-gray">Loading jobs...</div>
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg border border-soft-border p-5 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-midnight-ink text-sm line-clamp-2">{job.title}</h3>
                    <p className="text-xs text-cool-gray mt-1">
                      {job.job_type || 'Jewelry Job'}
                    </p>
                  </div>
                  {getStatusIcon(job.status)}
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'}`}>
                    {String(job.status).replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-cool-gray">Assigned To:</span>
                    <p className="font-medium text-midnight-ink">{job.assignee_name || job.assignee || 'Unassigned'}</p>
                  </div>

                  {job.location && (
                    <div>
                      <span className="text-cool-gray">Location:</span>
                      <p className="font-medium text-midnight-ink truncate">{job.location}</p>
                    </div>
                  )}

                  {job.priority && job.job_type && (
                    <div className="flex justify-between">
                      <div>
                        <span className="text-cool-gray">Priority:</span>
                        <p className={`font-medium ${PRIORITY_COLORS[job.priority] || 'text-midnight-ink'}`}>
                          {String(job.priority).charAt(0).toUpperCase() + String(job.priority).slice(1)}
                        </p>
                      </div>
                      {job.due_date && (
                        <div className="text-right">
                          <span className="text-cool-gray">Due:</span>
                          <p className="font-medium text-midnight-ink">{new Date(job.due_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {job.estimated_cost && (
                    <div>
                      <span className="text-cool-gray">Est. Cost:</span>
                      <p className="font-medium text-midnight-ink">₹{parseFloat(job.estimated_cost).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-soft-border">
                  <Link
                    href={`/frontend/jobs/${job.id}`}
                    className="text-trust-blue text-xs font-semibold hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-12 bg-white rounded-lg border border-soft-border">
            <p className="text-cool-gray">No jobs found</p>
          </div>
        ) : null}
      </div>
      <DeletionHistoryDrawer appLabel="jobs" modelName="job" />
    </div>
  )
}
