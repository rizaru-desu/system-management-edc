import type { WarehouseRecord } from '../data/warehouses.ts'

export interface WarehouseNode {
  record: WarehouseRecord
  children: Array<WarehouseNode>
}

/** A tree node flattened for table rendering, with its display metadata. */
export interface WarehouseRow {
  record: WarehouseRecord
  /** 0 = Central level; drives the indentation of the tree column. */
  depth: number
  /** Direct children currently rendered under this row (post-filter). */
  childCount: number
  hasChildren: boolean
  expanded: boolean
  parentName: string | null
}

/**
 * Builds the nested hierarchy from flat `parentId` records. Seed order is
 * preserved. Records pointing at a missing parent are promoted to roots so
 * a broken reference can never silently drop a whole subtree.
 */
export function buildWarehouseTree(
  records: Array<WarehouseRecord>,
): Array<WarehouseNode> {
  const nodes = new Map<string, WarehouseNode>(
    records.map((record) => [record.id, { record, children: [] }]),
  )
  const roots: Array<WarehouseNode> = []
  for (const record of records) {
    const node = nodes.get(record.id)!
    const parent = record.parentId ? nodes.get(record.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/**
 * Prunes the tree down to records matching `predicate`, keeping the
 * ancestor chain of every match so the hierarchy context stays visible (a
 * hit on "Service Point Bandung" still renders under its Central →
 * Regional chain).
 */
export function filterWarehouseTree(
  roots: Array<WarehouseNode>,
  predicate: (record: WarehouseRecord) => boolean,
): Array<WarehouseNode> {
  const prune = (node: WarehouseNode): WarehouseNode | null => {
    const children = node.children
      .map(prune)
      .filter((child): child is WarehouseNode => child !== null)
    if (children.length === 0 && !predicate(node.record)) return null
    return { record: node.record, children }
  }
  return roots.map(prune).filter((node): node is WarehouseNode => node !== null)
}

/**
 * Depth-first flatten of the (possibly filtered) tree into table rows,
 * descending only into expanded nodes. Pass `'all'` to ignore the expand
 * state — used while a search/filter is active so matches are never hidden
 * inside a collapsed branch.
 */
export function flattenVisibleRows(
  roots: Array<WarehouseNode>,
  expandedIds: ReadonlySet<string> | 'all',
): Array<WarehouseRow> {
  const rows: Array<WarehouseRow> = []
  const walk = (
    node: WarehouseNode,
    depth: number,
    parentName: string | null,
  ) => {
    const expanded = expandedIds === 'all' || expandedIds.has(node.record.id)
    rows.push({
      record: node.record,
      depth,
      childCount: node.children.length,
      hasChildren: node.children.length > 0,
      expanded,
      parentName,
    })
    if (expanded) {
      for (const child of node.children) {
        walk(child, depth + 1, node.record.name)
      }
    }
  }
  for (const root of roots) walk(root, 0, null)
  return rows
}

/** Ids of every record that can be expanded (has at least one child). */
export function collectParentIds(records: Array<WarehouseRecord>): Set<string> {
  const parents = new Set<string>()
  for (const record of records) {
    if (record.parentId) parents.add(record.parentId)
  }
  return parents
}

/** Ids of every record below `id` in the hierarchy (children, grandchildren…). */
export function collectDescendantIds(
  records: Array<WarehouseRecord>,
  id: string,
): Set<string> {
  const childrenOf = new Map<string, Array<string>>()
  for (const record of records) {
    if (!record.parentId) continue
    const siblings = childrenOf.get(record.parentId) ?? []
    siblings.push(record.id)
    childrenOf.set(record.parentId, siblings)
  }
  const descendants = new Set<string>()
  const queue = [...(childrenOf.get(id) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (descendants.has(current)) continue
    descendants.add(current)
    queue.push(...(childrenOf.get(current) ?? []))
  }
  return descendants
}

/**
 * One entry of the form's parent dropdown, served by GET
 * /warehouses/eligible-parents (see `api/eligible-parents.ts`).
 */
export interface ParentOption {
  id: string
  label: string
}
