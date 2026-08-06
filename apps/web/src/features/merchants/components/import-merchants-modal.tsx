import { useRef, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { cn } from '#/lib/utils.ts'
import {
  IMPORT_ACCEPTED_EXTENSIONS,
  buildImportPreview,
  downloadMerchantTemplate,
  importFileError,
  importMerchants,
} from '../lib/excel.ts'
import type { ImportPreview } from '../lib/excel.ts'

interface ImportMerchantsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** "1.2 MB"-style label for the selected file chip. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** One stat tile of the preview summary row. */
function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'danger'
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
          tone === 'default' && 'text-[#0E2748]',
        )}
      >
        {value}
      </p>
    </Card>
  )
}

/**
 * Excel import flow (UI-only): pick a file, preview the parsed rows with
 * their validation outcome, then run a simulated import. The template is
 * generated client-side with SheetJS; real parsing and persistence move to
 * the backend import endpoint later.
 */
export function ImportMerchantsModal({
  open,
  onOpenChange,
}: ImportMerchantsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const busy = previewing || importing

  const reset = () => {
    setFile(null)
    setDragActive(false)
    setPreview(null)
    setPreviewing(false)
    setImporting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Keep the dialog up while a simulated request is in flight.
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
      setPreview(await buildImportPreview(file))
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.validRows === 0) return
    setImporting(true)
    try {
      const imported = await importMerchants(preview)
      toast.success(
        `${imported} ${imported === 1 ? 'merchant' : 'merchants'} imported (simulation — no data was saved).`,
      )
      reset()
      onOpenChange(false)
    } finally {
      setImporting(false)
    }
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
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
            Import merchants from Excel
          </DialogTitle>
          <DialogDescription className="text-[#0E2748]/60">
            Upload a filled-in template, review the validation preview, then
            import the valid rows.
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
            {/* Step 2 — validation preview (mock data, UI-only) */}
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Total rows" value={preview.totalRows} />
              <SummaryCard
                label="Valid rows"
                value={preview.validRows}
                tone="success"
              />
              <SummaryCard
                label="Invalid rows"
                value={preview.invalidRows}
                tone="danger"
              />
            </div>

            <Card className="overflow-x-auto border-[#DDE0EC]">
              <table className="w-full min-w-2xl text-left text-sm">
                <thead>
                  <tr className="border-b border-[#DDE0EC] text-[11px] uppercase tracking-wider text-[#0E2748]/50">
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      Merchant Code
                    </th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      Merchant Name
                    </th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      PIC Name
                    </th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      Service Point
                    </th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      Validation Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="border-b border-[#DDE0EC] last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap text-[#0E2748]/80 tabular-nums">
                        {row.merchantCode || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[#0E2748]/80">
                        {row.merchantName || (
                          <span className="text-[#0E2748]/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70">
                        {row.picName || '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70">
                        {row.servicePoint || '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70 capitalize">
                        {row.status || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.error === null ? (
                          <Badge variant="success">
                            <CircleCheck className="h-3 w-3" strokeWidth={2} />
                            Valid
                          </Badge>
                        ) : (
                          <span className="leading-tight">
                            <Badge variant="danger">
                              <CircleX className="h-3 w-3" strokeWidth={2} />
                              Invalid
                            </Badge>
                            <span className="mt-1 block text-xs text-rose-600">
                              {row.error}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {preview.invalidRows > 0 && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {preview.invalidRows}{' '}
                {preview.invalidRows === 1 ? 'row is' : 'rows are'} invalid and
                will be skipped — fix them in the file and re-upload to import
                everything.
              </p>
            )}

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                onClick={() => setPreview(null)}
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
                  disabled={preview.validRows === 0 || importing}
                  onClick={handleImport}
                >
                  {importing && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={1.75}
                    />
                  )}
                  Import {preview.validRows}{' '}
                  {preview.validRows === 1 ? 'merchant' : 'merchants'}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
