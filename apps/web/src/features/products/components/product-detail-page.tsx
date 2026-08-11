import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  PackagePlus,
  Save,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { cn } from '#/lib/utils.ts'
import { itemCategoriesListQueryOptions } from '#/features/item-categories/index.ts'
import { useCreateProduct } from '../api/create-product.ts'
import type { ProductPayload } from '../api/create-product.ts'
import { isDuplicateModelNameError } from '../api/list-products.ts'
import { productDetailQueryOptions } from '../api/product-detail.ts'
import { useUpdateProduct } from '../api/update-product.ts'
import { PRODUCT_CATEGORIES } from '../data/products.ts'
import type { ProductCategory, ProductDetail } from '../data/products.ts'

/** One entry of the completeness dropdown (Item Categories master). */
interface ItemOption {
  id: string
  name: string
  code: string
  unit: string
}

/** One editable row of the standard-completeness table. */
interface CompletenessRow {
  /** Stable render key, independent of the picked item. */
  key: number
  /** '' until the user picks an item — required, validated on save. */
  itemCategoryId: string
  /** Display fallback when the item is missing from the active options. */
  itemName: string
  required: boolean
  /** Qty as entered; validated as a positive whole number on save. */
  qty: string
}

interface GeneralErrors {
  modelName?: string
  brand?: string
  category?: string
}

const TABS = [
  { key: 'general', label: 'General Information' },
  { key: 'completeness', label: 'Standard Completeness' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface ProductDetailPageProps {
  /** null renders the create flow; otherwise edits the given product. */
  productId: string | null
}

/**
 * Terminal Lifecycle → Products → detail. One page serves both create and
 * edit, split over two tabs: the general product fields, and the standard
 * completeness list (item + required flag + qty) that the Inbound Shipment
 * module will consume as its per-unit inspection checklist. The record
 * comes from GET /products/:id; the completeness dropdown feeds off the
 * live Item Categories master (active items only), and saves go through
 * POST/PATCH — the completeness list replaced wholesale server-side.
 */
export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const detailQuery = useQuery({
    ...productDetailQueryOptions(productId ?? ''),
    enabled: productId !== null,
  })

  if (productId !== null) {
    if (detailQuery.isPending) {
      return (
        <div className="animate-fade-up flex items-center justify-center py-24 text-sm text-brand-900/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading product…
        </div>
      )
    }
    if (detailQuery.isError) {
      return (
        <div className="animate-fade-up">
          <EmptyState
            icon={TriangleAlert}
            tone="danger"
            title={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Failed to load the product.'
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => detailQuery.refetch()}
              >
                Try again
              </Button>
            }
          />
        </div>
      )
    }
    // A 404 resolves to null (see the detail server fn).
    if (detailQuery.data === null) {
      return (
        <div className="animate-fade-up">
          <EmptyState
            icon={SearchX}
            iconChip
            title="Product not found"
            description="It may have been removed, or the link is out of date."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/products">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                  Back to products
                </Link>
              </Button>
            }
          />
        </div>
      )
    }
  }

  // The editor mounts only once the record is loaded, so its form state
  // initializers can seed straight from props.
  return <ProductEditor product={productId ? detailQuery.data! : null} />
}

function ProductEditor({ product }: { product: ProductDetail | null }) {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabKey>('general')

  // ── General information ────────────────────────────────────────────────
  const [modelName, setModelName] = useState(product?.modelName ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [category, setCategory] = useState<ProductCategory | ''>(
    product?.category ?? '',
  )
  const [description, setDescription] = useState(product?.description ?? '')
  const [status, setStatus] = useState<ProductDetail['status']>(
    product?.status ?? 'active',
  )
  const [generalErrors, setGeneralErrors] = useState<GeneralErrors>({})

  // ── Standard completeness rows ─────────────────────────────────────────
  const rowKeyRef = useRef(0)
  const [rows, setRows] = useState<Array<CompletenessRow>>(() =>
    (product?.completenessItems ?? []).map((item) => ({
      key: rowKeyRef.current++,
      itemCategoryId: item.itemCategoryId,
      itemName: item.itemName,
      required: item.required,
      qty: String(item.standardQty),
    })),
  )
  /** Per-row validation message, keyed by the row's render key. */
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  // The dropdown options come from the live Item Categories master —
  // active items only, same source the backend validates against.
  const itemsQuery = useQuery(
    itemCategoriesListQueryOptions({ status: 'active', pageSize: 100 }),
  )
  const itemOptions = useMemo<Array<ItemOption>>(
    () =>
      (itemsQuery.data?.itemCategories ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        unit: item.unit,
      })),
    [itemsQuery.data],
  )

  const usedItemIds = useMemo(
    () => new Set(rows.map((row) => row.itemCategoryId).filter(Boolean)),
    [rows],
  )
  const allItemsUsed =
    itemOptions.length > 0 &&
    itemOptions.every((option) => usedItemIds.has(option.id))

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        key: rowKeyRef.current++,
        itemCategoryId: '',
        itemName: '',
        required: true,
        qty: '1',
      },
    ])
  }

  const updateRow = (key: number, patch: Partial<CompletenessRow>) => {
    setRows((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
    setRowErrors((previous) => ({ ...previous, [key]: '' }))
  }

  const removeRow = (key: number) => {
    setRows((previous) => previous.filter((row) => row.key !== key))
    setRowErrors((previous) => ({ ...previous, [key]: '' }))
  }

  // ── Save (backend API; the mutation hooks own toasts) ─────────────────
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const saving = createProduct.isPending || updateProduct.isPending

  const handleSave = () => {
    if (saving) return
    const nextGeneralErrors: GeneralErrors = {}
    if (!modelName.trim()) {
      nextGeneralErrors.modelName = 'Model name is required.'
    }
    if (!brand.trim()) nextGeneralErrors.brand = 'Brand is required.'
    if (!category) nextGeneralErrors.category = 'Category is required.'
    setGeneralErrors(nextGeneralErrors)

    const nextRowErrors: Record<number, string> = {}
    for (const row of rows) {
      if (!row.itemCategoryId) {
        nextRowErrors[row.key] = 'Pick a completeness item.'
        continue
      }
      const qty = Number(row.qty)
      if (!row.qty.trim() || Number.isNaN(qty) || !Number.isInteger(qty)) {
        nextRowErrors[row.key] = 'Qty must be a whole number.'
      } else if (qty <= 0) {
        nextRowErrors[row.key] = 'Qty must be at least 1.'
      }
    }
    setRowErrors(nextRowErrors)

    // Land the user on the first tab that still has a problem.
    if (Object.keys(nextGeneralErrors).length > 0) {
      setActiveTab('general')
      return
    }
    if (Object.keys(nextRowErrors).length > 0) {
      setActiveTab('completeness')
      return
    }

    const payload: ProductPayload = {
      modelName: modelName.trim(),
      brand: brand.trim(),
      category: category as ProductCategory,
      description: description.trim(),
      status,
      completenessItems: rows.map((row) => ({
        itemCategoryId: row.itemCategoryId,
        required: row.required,
        standardQty: Number(row.qty),
      })),
    }

    // The page stays open on failure so the input survives; a duplicate
    // model-name 409 additionally highlights the field inline (the toast
    // carries the backend message either way).
    const callbacks = {
      onSuccess: () => void navigate({ to: '/products' }),
      onError: (error: unknown) => {
        if (isDuplicateModelNameError(error)) {
          setGeneralErrors((previous) => ({
            ...previous,
            modelName: 'A product with this model name already exists.',
          }))
          setActiveTab('general')
        }
      },
    }
    if (product) {
      updateProduct.mutate({ id: product.id, ...payload }, callbacks)
      return
    }
    createProduct.mutate(payload, callbacks)
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle · Products
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon-sm" asChild>
              <Link to="/products" aria-label="Back to products">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
              {product ? product.modelName : 'New Product'}
            </h1>
            {product && (
              <>
                <Badge variant="soft">{product.category}</Badge>
                <StatusPill active={product.status === 'active'} />
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-900/60">
            {product
              ? 'Update the model details and its standard completeness list.'
              : 'Register an EDC model and define the completeness shipped with every unit.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/products">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} />
            )}
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {/* Tab strip (same treatment as the user device drawer). */}
        <div className="border-b border-brand-100 bg-white px-6">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors',
                  activeTab === tab.key
                    ? 'text-brand-500'
                    : 'text-brand-900/50 hover:text-brand-900/80',
                )}
              >
                {tab.label}
                {tab.key === 'completeness' && (
                  <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900/60 tabular-nums">
                    {rows.length}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1 — General Information */}
        {activeTab === 'general' && (
          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prd-model" className="text-[#0E2748]">
                  Model name{' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="prd-model"
                  value={modelName}
                  onChange={(event) => {
                    setModelName(event.target.value)
                    setGeneralErrors((previous) => ({
                      ...previous,
                      modelName: undefined,
                    }))
                  }}
                  placeholder="e.g. PAX A920 Pro"
                  aria-invalid={Boolean(generalErrors.modelName)}
                  className={fieldClasses}
                />
                {generalErrors.modelName && (
                  <p className="text-xs text-rose-600">
                    {generalErrors.modelName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prd-brand" className="text-[#0E2748]">
                  Brand{' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="prd-brand"
                  value={brand}
                  onChange={(event) => {
                    setBrand(event.target.value)
                    setGeneralErrors((previous) => ({
                      ...previous,
                      brand: undefined,
                    }))
                  }}
                  placeholder="e.g. PAX Technology"
                  aria-invalid={Boolean(generalErrors.brand)}
                  className={fieldClasses}
                />
                {generalErrors.brand && (
                  <p className="text-xs text-rose-600">{generalErrors.brand}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prd-category" className="text-[#0E2748]">
                  Category{' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value as ProductCategory)
                    setGeneralErrors((previous) => ({
                      ...previous,
                      category: undefined,
                    }))
                  }}
                >
                  <SelectTrigger
                    id="prd-category"
                    aria-invalid={Boolean(generalErrors.category)}
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {generalErrors.category && (
                  <p className="text-xs text-rose-600">
                    {generalErrors.category}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prd-description" className="text-[#0E2748]">
                Description{' '}
                <span className="font-normal text-[#0E2748]/40">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="prd-description"
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Terminal Android genggam dengan printer terintegrasi"
                className={fieldClasses}
              />
            </div>

            {/* Upload placeholder — the real upload flow ships with backend
              storage; this only reserves the layout slot. */}
            <div className="space-y-1.5">
              <Label className="text-[#0E2748]">
                Product photo{' '}
                <span className="font-normal text-[#0E2748]/40">
                  (optional)
                </span>
              </Label>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#DDE0EC] bg-brand-50/40 px-6 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="text-sm font-medium text-brand-900/70">
                  Photo upload coming soon
                </p>
                <p className="text-xs text-brand-900/45">
                  Uploading will be enabled once the backend storage is wired
                  up.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[#0E2748]">
                  Active product
                </p>
                <p className="text-xs text-[#0E2748]/50">
                  Inactive models stay in the catalogue but are hidden from new
                  terminal registration.
                </p>
              </div>
              <Switch
                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                checked={status === 'active'}
                onCheckedChange={(checked) =>
                  setStatus(checked ? 'active' : 'inactive')
                }
              />
            </div>
          </div>
        )}

        {/* Tab 2 — Standard Completeness */}
        {activeTab === 'completeness' && (
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-brand-900/60">
                Items shipped with every unit of this model — the Inbound
                Shipment inspection checklist derives from this list.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={itemsQuery.isPending || allItemsUsed}
              >
                <PackagePlus
                  className="h-4 w-4 text-primary"
                  strokeWidth={1.75}
                />
                Add completeness item
              </Button>
            </div>

            {itemsQuery.isError && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                Failed to load the Item Categories master — the item dropdown
                may be incomplete.{' '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => itemsQuery.refetch()}
                >
                  Try again
                </button>
              </p>
            )}

            {rows.length === 0 ? (
              <EmptyState
                icon={PackagePlus}
                iconChip
                title="No completeness items yet"
                description="Add the items every unit of this model ships with."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-brand-100">
                <table className="w-full min-w-2xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                      <th className="px-4 py-3 font-semibold">
                        Completeness item
                      </th>
                      <th className="px-4 py-3 font-semibold">Required</th>
                      <th className="px-4 py-3 font-semibold">Standard qty</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      // Every active option not claimed by another row (the
                      // same item can never be listed twice), plus the row's
                      // own pick even when it is no longer active so an
                      // existing checklist still renders and round-trips.
                      const options: Array<ItemOption> = itemOptions.filter(
                        (option) =>
                          option.id === row.itemCategoryId ||
                          !usedItemIds.has(option.id),
                      )
                      if (
                        row.itemCategoryId &&
                        !options.some(
                          (option) => option.id === row.itemCategoryId,
                        )
                      ) {
                        options.unshift({
                          id: row.itemCategoryId,
                          name: `${row.itemName} (inactive)`,
                          code: '',
                          unit: '',
                        })
                      }
                      return (
                        <tr
                          key={row.key}
                          className="border-b border-brand-100 last:border-0"
                        >
                          <td className="px-4 py-3 align-top">
                            <Select
                              value={row.itemCategoryId}
                              onValueChange={(value) =>
                                updateRow(row.key, {
                                  itemCategoryId: value,
                                  itemName:
                                    itemOptions.find(
                                      (option) => option.id === value,
                                    )?.name ?? row.itemName,
                                })
                              }
                              disabled={itemsQuery.isPending}
                            >
                              <SelectTrigger
                                aria-invalid={Boolean(rowErrors[row.key])}
                                className={`w-full min-w-[220px] ${fieldClasses}`}
                              >
                                <SelectValue
                                  placeholder={
                                    itemsQuery.isPending
                                      ? 'Loading items…'
                                      : 'Select an item'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                    {option.code ? ` (${option.code})` : ''}
                                    {option.unit ? ` — ${option.unit}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {rowErrors[row.key] && (
                              <p className="mt-1 text-xs text-rose-600">
                                {rowErrors[row.key]}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2.5 pt-1.5">
                              <Switch
                                size="sm"
                                checked={row.required}
                                onCheckedChange={(checked) =>
                                  updateRow(row.key, { required: checked })
                                }
                                aria-label="Required item"
                                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                              />
                              <span className="text-xs text-brand-900/60">
                                {row.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={row.qty}
                              onChange={(event) =>
                                updateRow(row.key, { qty: event.target.value })
                              }
                              aria-label="Standard quantity"
                              aria-invalid={Boolean(rowErrors[row.key])}
                              className={`w-24 ${fieldClasses}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Remove item"
                              aria-label="Remove completeness item"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => removeRow(row.key)}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {allItemsUsed && (
              <p className="mt-3 text-xs text-brand-900/50">
                Every active completeness item from the Item Categories master
                is already on this product.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
