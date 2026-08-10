import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PackagePlus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { PRODUCT_CATEGORIES, getProducts } from '../data/products.ts'
import type {
  ProductCategory,
  ProductRecord,
  ProductStatus,
} from '../data/products.ts'
import { ProductsTable } from './products-table.tsx'

/**
 * Terminal Lifecycle → Products: the master catalogue of EDC models each
 * individual Terminal (per serial number) will reference, with the
 * standard completeness list the Inbound Shipment inspection checklist
 * derives from. UI-only for now — the catalogue lives in a module-level
 * mock store (shared with the detail page); search, category/status
 * filters and pagination all run client-side.
 */
export function ProductsPage() {
  const navigate = useNavigate()
  // Snapshot per navigation is enough for the mock stage — edits happen on
  // the detail page, which navigates back here and remounts.
  const [records] = useState<Array<ProductRecord>>(getProducts)

  // ── Search & filters ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all')
  // Debounced copy of `search` so the list isn't re-filtered per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategoryFilter('all')
    setStatusFilter('all')
  }

  const filteredRecords = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return records.filter((record) => {
      const matchesTerm =
        term === '' ||
        record.modelName.toLowerCase().includes(term) ||
        record.brand.toLowerCase().includes(term)
      const matchesCategory =
        categoryFilter === 'all' || record.category === categoryFilter
      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter
      return matchesTerm && matchesCategory && matchesStatus
    })
  }, [records, debouncedSearch, categoryFilter, statusFilter])

  // ── Pagination (client-side over the filtered list) ────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or a filter changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, categoryFilter, statusFilter])

  const pageRows = useMemo(
    () =>
      filteredRecords.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize,
      ),
    [filteredRecords, pagination],
  )

  // ── Navigation (create & edit both live on the detail page) ────────────
  const openCreate = () => {
    void navigate({ to: '/products/new' })
  }

  const openDetail = (record: ProductRecord) => {
    void navigate({
      to: '/products/$productId',
      params: { productId: record.id },
    })
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Products
          </h1>
          <p className="text-sm text-brand-900/60">
            Master catalogue of EDC models — the type each individual terminal
            references, with its standard completeness list.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          Add product
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search model or brand…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            setCategoryFilter(value as 'all' | ProductCategory)
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | ProductStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ProductsTable
        rows={pageRows}
        total={filteredRecords.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onOpen={openDetail}
      />
    </div>
  )
}
