import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { useDeleteProduct } from '../api/delete-product.ts'
import { productsListQueryOptions } from '../api/list-products.ts'
import { useToggleProductStatus } from '../api/update-product.ts'
import { PRODUCT_CATEGORIES } from '../data/products.ts'
import type {
  ProductCategory,
  ProductRecord,
  ProductStatus,
} from '../data/products.ts'
import { DeleteProductDialog } from './delete-product-dialog.tsx'
import { ProductsTable } from './products-table.tsx'

/**
 * Terminal Lifecycle → Products: the master catalogue of EDC models each
 * individual Terminal (per serial number) will reference. Search,
 * category/status filters and pagination all run server-side
 * (GET /products), and every action goes through the backend API; the
 * mutation hooks own toasts and cache invalidation, so the table refreshes
 * after every write. Create and edit live on the detail page.
 */
export function ProductsPage() {
  const navigate = useNavigate()

  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
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

  // ── Pagination (server-side) ───────────────────────────────────────────
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

  const listQuery = useQuery(
    productsListQueryOptions({
      search: debouncedSearch,
      category: categoryFilter,
      status: statusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const products = listQuery.data?.products ?? []
  const total = listQuery.data?.total ?? 0

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

  // ── Mutations (the hooks own toasts + cache invalidation) ─────────────
  const toggleStatus = useToggleProductStatus()
  const deleteProduct = useDeleteProduct()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ProductRecord | null>(null)

  const openDelete = (record: ProductRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteProduct.mutate({ id: deleting.id, modelName: deleting.modelName })
    setDeleting(null)
  }

  const handleToggleStatus = (record: ProductRecord) => {
    toggleStatus.mutate({ id: record.id })
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
          isFetching={listQuery.isFetching && !listQuery.isPending}
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
        rows={products}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load products.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onOpen={openDetail}
        onToggleStatus={handleToggleStatus}
        onDelete={openDelete}
      />

      <DeleteProductDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        product={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
