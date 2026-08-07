import * as React from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchX,
} from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils.ts'
import { EmptyState } from './empty-state.tsx'
import { SearchInput } from './search-input.tsx'

/** One choice of the options-driven `<Select options={…}>` API. */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectOptionsProps extends Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  'children' | 'open' | 'defaultOpen'
> {
  /**
   * Flat choice list. When set, the trigger and dropdown render
   * automatically — no SelectTrigger/SelectContent children needed.
   */
  options: Array<SelectOption>
  /** Adds a case-insensitive label search box inside the dropdown. */
  searchable?: boolean
  placeholder?: string
  searchPlaceholder?: string
  /** Forwarded to the trigger button (label association + form styling). */
  id?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  size?: 'sm' | 'default'
  triggerClassName?: string
  contentClassName?: string
}

/**
 * The shared select. Two modes:
 *
 * - **Compositional (existing usage, unchanged):** without `options`, this
 *   is the plain Radix root — bring your own SelectTrigger/SelectContent.
 * - **Options-driven:** with `options`, the whole control renders from the
 *   list; `searchable` adds an in-dropdown search box with keyboard
 *   navigation (arrows/Enter/Escape pass through to Radix) that resets on
 *   close and shows the shared empty state when nothing matches.
 */
function Select(
  props: React.ComponentProps<typeof SelectPrimitive.Root> | SelectOptionsProps,
) {
  if ('options' in props) {
    return <OptionsSelect {...props} />
  }
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

/** Keys the search box hands over to Radix for list navigation. */
const SEARCH_PASSTHROUGH_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'Enter',
  'Escape',
  'Tab',
])

function OptionsSelect({
  options,
  searchable = false,
  placeholder,
  searchPlaceholder = 'Search…',
  id,
  'aria-invalid': ariaInvalid,
  size,
  triggerClassName,
  contentClassName,
  value,
  ...rootProps
}: SelectOptionsProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Reset the search whenever the dropdown closes, per open/close cycle.
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setSearch('')
    rootProps.onOpenChange?.(nextOpen)
  }

  // Radix focuses the selected item on open; move focus into the search box
  // right after so typing filters immediately.
  React.useEffect(() => {
    if (!open || !searchable) return
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, searchable])

  const term = search.trim().toLowerCase()
  const visibleOptions =
    !searchable || term === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(term))

  // The trigger label is rendered manually (not via SelectValue) so it
  // survives the selected item being filtered out of the DOM while searching.
  const selected = options.find((option) => option.value === value)

  return (
    <SelectPrimitive.Root
      data-slot="select"
      value={value}
      {...rootProps}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        size={size}
        className={triggerClassName}
      >
        <span
          data-slot="select-value"
          className={cn(
            'line-clamp-1 text-left',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
      </SelectTrigger>
      <SelectContent
        position="popper"
        className={cn('max-h-[300px]', contentClassName)}
        header={
          searchable ? (
            <div
              className="border-b border-brand-100 p-2"
              // Radix Select's typeahead listens on the content: keep typed
              // characters in the input, hand navigation keys to Radix.
              onKeyDown={(event) => {
                if (!SEARCH_PASSTHROUGH_KEYS.has(event.key)) {
                  event.stopPropagation()
                }
              }}
            >
              <SearchInput
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 text-sm"
                containerClassName="min-w-0"
              />
            </div>
          ) : undefined
        }
      >
        {visibleOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
        {searchable && visibleOptions.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="No results found"
            className="py-6"
          />
        )}
      </SelectContent>
    </SelectPrimitive.Root>
  )
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        // The console is always light: pin the trigger against the dark shell
        // tokens so feature files don't have to re-override it everywhere.
        'border-brand-100 bg-white text-brand-900 dark:border-brand-100 dark:bg-white dark:hover:bg-white',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  header,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  /** Pinned above the scrolling viewport (e.g. the searchable search box). */
  header?: React.ReactNode
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          // Portals escape the console's theme-light wrapper — re-scope light
          // tokens here so every menu renders light without per-usage classes.
          'theme-light border-brand-100 bg-white text-brand-900',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          // With a pinned header the content itself must not scroll — the
          // viewport (flex-1) takes over so the header stays in place.
          header !== undefined && 'flex flex-col overflow-hidden',
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        {header}
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
            header !== undefined && 'h-auto min-h-0 flex-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
