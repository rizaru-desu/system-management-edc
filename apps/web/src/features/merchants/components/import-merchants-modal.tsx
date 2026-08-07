import { useRef, useState } from 'react'
import {
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { cn } from '#/lib/utils.ts'
import {
  previewMerchantImport,
  useImportMerchants,
} from '../api/import-merchants.ts'
import type {
  ImportPreviewResult,
  RawImportRow,
} from '../api/import-merchants.ts'
import {
  IMPORT_ACCEPTED_EXTENSIONS,
  downloadMerchantTemplate,
  importFileError,
  parseMerchantWorkbook,
} from '../lib/excel.ts'
import { ImportPreviewTable } from './import-preview-table.tsx'

interface ImportMerchantsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** "1.2 MB"-style label for the selected file chip. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatCount = (value: number): string => value.toLocaleString('en-US')

/** One stat tile of the preview summary row. */
function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'danger' | 'info'
}) {
  return (
    <Card className="border-[#DDE0EC] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0E2748]/45">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          tone === 'success' && 'text-emerald-600',
          tone === 'danger' && 'text-rose-600',
          tone === 'info' && 'text-[#3F6FA8]',
          tone === 'default' && 'text-[#0E2748]',
        )}
      >
        {value}
      </p>
    </Card>
  )
}

/**
 * Excel import flow: pick a file, preview the backend's validation and
 * automatic nearest-service-point assignment (computed from each row's
 * latitude/longitude), then commit — the valid, automatically assigned rows
 * are saved through POST /merchants/import.
 */
export function ImportMerchantsModal({
  open,
  onOpenChange,
}: ImportMerchantsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  // The parsed sheet rows behind the current preview — the commit posts
  // these same rows so the backend re-validates exactly what was shown.
  const [parsedRows, setParsedRows] = useState<Array<RawImportRow> | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const importMerchants = useImportMerchants()
  const importing = importMerchants.isPending
  const busy = previewing || importing

  const reset = () => {
    setFile(null)
    setDragActive(false)
    setParsedRows(null)
    setPreview(null)
    setPreviewing(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Keep the dialog up while a request is in flight.
    if (!nextOpen && busy) return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const selectFile = (candidate: File) => {
    const error = importFileError(candidate)
    if (error) {
      toast.error(error)
      return
    }
    setFile(candidate)
    setParsedRows(null)
    setPreview(null)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
    const dropped = event.dataTransfer.files.item(0)
    if (dropped) selectFile(dropped)
  }

  const handlePreview = async () => {
    if (!file) return
    setPreviewing(true)
    try {
      const parsed = await parseMerchantWorkbook(file)
      if (!parsed.ok) {
        toast.error(parsed.error)
        return
      }
      setPreview(await previewMerchantImport(parsed.rows))
      setParsedRows(parsed.rows)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to validate the import file.',
      )
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = () => {
    if (!parsedRows || !preview || preview.summary.assigned === 0) return
    importMerchants.mutate(
      { rows: parsedRows },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadMerchantTemplate()
    } catch {
      toast.error('Failed to generate the import template.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        disableOutsideClose
        className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
            Import merchants from Excel
          </DialogTitle>
          <DialogDescription className="text-[#0E2748]/60">
            Upload a filled-in template — each merchant is automatically
            assigned to the nearest service point from its latitude and
            longitude.
          </DialogDescription>
        </DialogHeader>

        {preview === null ? (
          <>
            {/* Step 1 — file selection */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload an Excel file"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragActive
                  ? 'border-[#3F6FA8] bg-[#3F6FA8]/5'
                  : 'border-[#DDE0EC] hover:border-[#3F6FA8]/50 hover:bg-[#3F6FA8]/[0.03]',
              )}
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3F6FA8]/10 text-[#3F6FA8]">
                <CloudUpload className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-[#0E2748]/80">
                Drag &amp; drop your Excel file here
              </p>
              <p className="mt-1 text-xs text-[#0E2748]/50">
                or browse from your computer
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={(event) => {
                  event.stopPropagation()
                  inputRef.current?.click()
                }}
              >
                <Upload className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Browse file
              </Button>
              <p className="mt-4 text-[11px] text-[#0E2748]/45">
                Supported formats: .xlsx, .xls · Maximum file size 10 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={IMPORT_ACCEPTED_EXTENSIONS.join(',')}
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0]
                  if (picked) selectFile(picked)
                  // Allow re-selecting the same file after removing it.
                  event.target.value = ''
                }}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-lg border border-[#DDE0EC] px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium text-[#0E2748]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[#0E2748]/50">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove selected file"
                  onClick={() => setFile(null)}
                  className="text-[#0E2748]/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            )}

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Download template
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!file || previewing}
                  onClick={handlePreview}
                >
                  {previewing && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={1.75}
                    />
                  )}
                  Preview
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Step 2 — validation + assignment preview */}
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <SummaryCard
                  label="Total rows"
                  value={preview.summary.totalRows}
                />
                <SummaryCard
                  label="Valid rows"
                  value={preview.summary.validRows}
                  tone="success"
                />
                <SummaryCard
                  label="Invalid rows"
                  value={preview.summary.invalidRows}
                  tone="danger"
                />
                <SummaryCard
                  label="Assigned automatically"
                  value={preview.summary.assigned}
                  tone="info"
                />
                <SummaryCard
                  label="Need manual assignment"
                  value={preview.summary.needManualAssignment}
                />
              </div>

              <ImportPreviewTable
                rows={preview.rows}
                summary={preview.summary}
              />

              <p className="rounded-lg bg-[#3F6FA8]/5 px-3 py-2 text-xs text-[#0E2748]/70">
                <span className="font-semibold text-[#0E2748]">
                  {formatCount(preview.summary.assigned)}
                </span>{' '}
                {preview.summary.assigned === 1 ? 'record' : 'records'} will be
                imported.
                {preview.summary.invalidRows > 0 && (
                  <>
                    {' '}
                    <span className="font-semibold text-rose-600">
                      {formatCount(preview.summary.invalidRows)}
                    </span>{' '}
                    {preview.summary.invalidRows === 1
                      ? 'record contains'
                      : 'records contain'}{' '}
                    validation errors and will be skipped.
                  </>
                )}
                {preview.summary.needManualAssignment > 0 && (
                  <>
                    {' '}
                    <span className="font-semibold text-[#0E2748]">
                      {formatCount(preview.summary.needManualAssignment)}
                    </span>{' '}
                    valid{' '}
                    {preview.summary.needManualAssignment === 1
                      ? 'record needs'
                      : 'records need'}{' '}
                    manual assignment (outside coverage radius or no active
                    service point) and will be skipped.
                  </>
                )}
              </p>
            </DialogBody>

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                onClick={() => {
                  setPreview(null)
                  setParsedRows(null)
                }}
              >
                Choose another file
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={importing}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={preview.summary.assigned === 0 || importing}
                  onClick={handleImport}
                >
                  {importing && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={1.75}
                    />
                  )}
                  Import {formatCount(preview.summary.assigned)}{' '}
                  {preview.summary.assigned === 1 ? 'merchant' : 'merchants'}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
