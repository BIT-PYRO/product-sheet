'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Trash2, FileText, ChevronDown } from 'lucide-react'
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page'

const DRAFTS_STORAGE_KEY = 'form_drafts'

// Create context for draft loading
export const DraftLoaderContext = createContext(null)

export function DraftsManager({ openOnMount = false }) {
  const [isDraftsOpen, setIsDraftsOpen] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [expandedSection, setExpandedSection] = useState(null)
  const [loadingDraft, setLoadingDraft] = useState(null)
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false)
  const [workforceDraftData, setWorkforceDraftData] = useState(null)

  useEffect(() => {
    if (openOnMount) {
      setIsDraftsOpen(true)
    }
  }, [openOnMount])

  // Load drafts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (stored) {
      try {
        setDrafts(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse drafts:', e)
        setDrafts({})
      }
    }
  }, [isDraftsOpen])

  const saveDraft = (section, draftId, draftData) => {
    const updatedDrafts = { ...drafts }
    if (!updatedDrafts[section]) {
      updatedDrafts[section] = []
    }
    
    const existingIndex = updatedDrafts[section].findIndex(d => d.id === draftId)
    if (existingIndex >= 0) {
      updatedDrafts[section][existingIndex] = {
        ...draftData,
        id: draftId,
        savedAt: new Date().toISOString(),
        section: section, // Add section metadata
      }
    } else {
      updatedDrafts[section].push({
        ...draftData,
        id: draftId || Date.now().toString(),
        savedAt: new Date().toISOString(),
        section: section, // Add section metadata
      })
    }
    
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts))
    setDrafts(updatedDrafts)
  }

  const handleLoadDraft = (section, draft) => {
    // Special handling for Enroll Workforce - open modal with draft data
    if (section === 'Enroll Workforce') {
      setWorkforceDraftData(draft)
      setIsEnrollWorkforceOpen(true)
      // Don't close the drafts dialog, let user interact with modal
      return
    }
    
    // For other sections (Create Job, Quick Enroll), use custom event
    setLoadingDraft({
      section,
      data: draft,
    })
    // Notify all listeners
    window.dispatchEvent(
      new CustomEvent('draftLoad', {
        detail: { section, data: draft },
      })
    )
    // Close the drafts dialog
    setIsDraftsOpen(false)
  }

  const deleteDraft = (section, draftId) => {
    const updatedDrafts = { ...drafts }
    if (updatedDrafts[section]) {
      updatedDrafts[section] = updatedDrafts[section].filter(d => d.id !== draftId)
      if (updatedDrafts[section].length === 0) {
        delete updatedDrafts[section]
      }
    }
    
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts))
    setDrafts(updatedDrafts)
  }

  const clearAllDrafts = () => {
    localStorage.removeItem(DRAFTS_STORAGE_KEY)
    setDrafts({})
  }

  // Expose draft manager functions to window for global access
  useEffect(() => {
    window.__draftManager = { saveDraft, deleteDraft, clearAllDrafts, handleLoadDraft, loadingDraft }
  }, [loadingDraft])

  const totalDrafts = Object.values(drafts).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <>
      <Button
        onClick={() => setIsDraftsOpen(true)}
        className="bg-trust-blue hover:bg-deep-blue text-white rounded-full px-6 flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Drafts {totalDrafts > 0 && `(${totalDrafts})`}
      </Button>

      <Dialog open={isDraftsOpen} onOpenChange={setIsDraftsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold">Saved Drafts</DialogTitle>
          </DialogHeader>

          {totalDrafts === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-cool-gray mb-4" />
              <p className="text-cool-gray text-center">No saved drafts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(drafts).map(([section, sectionDrafts]) => (
                <div key={section} className="border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-cloud-gray"
                  >
                    <h3 className="font-semibold text-slate-text">{section}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cool-gray">({sectionDrafts.length})</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSection === section ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expandedSection === section && (
                    <div className="border-t bg-cloud-gray">
                      <div className="space-y-2 p-4">
                        {sectionDrafts.map((draft) => (
                          <div key={draft.id} className="flex items-center justify-between bg-white p-3 rounded border hover:border-blue-400 hover:bg-trust-blue/10 transition-colors cursor-pointer group">
                            <button
                              onClick={() => handleLoadDraft(section, draft)}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-medium text-slate-text group-hover:text-deep-blue">
                                {draft.title || `Draft from ${new Date(draft.savedAt).toLocaleDateString()}`}
                              </p>
                              <p className="text-sm text-cool-gray">
                                Saved: {new Date(draft.savedAt).toLocaleString()}
                              </p>
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteDraft(section, draft.id)
                              }}
                              className="text-danger hover:text-danger-dark hover:bg-danger/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="border-t pt-4 flex gap-2">
            {totalDrafts > 0 && (
              <Button
                onClick={clearAllDrafts}
                variant="outline"
                className="text-danger border-danger/30 hover:bg-danger/10"
              >
                Clear All Drafts
              </Button>
            )}
            <Button onClick={() => setIsDraftsOpen(false)} className="ms-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Workforce Modal */}
      {isEnrollWorkforceOpen && workforceDraftData && (
        <EnrolWorkforceForm
          open={isEnrollWorkforceOpen}
          onClose={() => {
            setIsEnrollWorkforceOpen(false)
            setWorkforceDraftData(null)
            // Reload drafts to ensure latest data
            const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
            if (stored) {
              try {
                setDrafts(JSON.parse(stored))
              } catch (e) {
                console.error('Failed to parse drafts:', e)
              }
            }
          }}
          draftData={workforceDraftData}
        />
      )}

    </>
  )
}

// Hook to listen for draft loading events
export function useDraftLoader() {
  const [loadedDraft, setLoadedDraft] = useState(null)

  useEffect(() => {
    const handleDraftLoad = (event) => {
      setLoadedDraft(event.detail)
    }

    window.addEventListener('draftLoad', handleDraftLoad)
    return () => window.removeEventListener('draftLoad', handleDraftLoad)
  }, [])

  return loadedDraft
}

// Utility function to get draft manager from window
export function getDraftManager() {
  if (typeof window !== 'undefined' && window.__draftManager) {
    return window.__draftManager
  }
  return null
}

// Hook to use draft manager
export function useDrafts() {
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (stored) {
      try {
        setDrafts(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse drafts:', e)
      }
    }
  }, [])

  const saveDraft = (section, draftId, draftData) => {
    const updatedDrafts = { ...drafts }
    if (!updatedDrafts[section]) {
      updatedDrafts[section] = []
    }

    const existingIndex = updatedDrafts[section].findIndex(d => d.id === draftId)
    if (existingIndex >= 0) {
      updatedDrafts[section][existingIndex] = {
        ...draftData,
        id: draftId,
        savedAt: new Date().toISOString(),
        section: section, // Add section metadata
      }
    } else {
      updatedDrafts[section].push({
        ...draftData,
        id: draftId || Date.now().toString(),
        savedAt: new Date().toISOString(),
        section: section, // Add section metadata
      })
    }

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts))
    setDrafts(updatedDrafts)
  }

  return { drafts, saveDraft }
}
