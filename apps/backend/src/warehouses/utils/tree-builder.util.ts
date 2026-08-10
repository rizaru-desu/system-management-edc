import type { WarehouseRow } from '@repo/db';

/** One node of GET /warehouses/tree: a row plus its nested children. */
export interface WarehouseTreeNode extends WarehouseRow {
  children: WarehouseTreeNode[];
}

/**
 * Builds the recursive hierarchy from flat `parentId` rows. Input order is
 * preserved among siblings (the query layer sorts by name). Rows pointing
 * at a parent that is missing from the input (e.g. soft-deleted out from
 * under them) are promoted to roots so a broken reference can never
 * silently drop a whole subtree.
 */
export function buildWarehouseTree(rows: WarehouseRow[]): WarehouseTreeNode[] {
  const nodes = new Map<string, WarehouseTreeNode>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );

  const roots: WarehouseTreeNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
