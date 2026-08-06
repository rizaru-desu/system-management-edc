import type { ServicePointRow } from '@repo/db';

/** One node of GET /service-points/tree: a row plus its nested children. */
export interface ServicePointTreeNode extends ServicePointRow {
  children: ServicePointTreeNode[];
}

/**
 * Builds the recursive hierarchy from flat `parentId` rows, supporting
 * unlimited nesting. Input order is preserved among siblings (the query
 * layer sorts by name). Rows pointing at a parent that is missing from the
 * input (e.g. soft-deleted out from under them) are promoted to roots so a
 * broken reference can never silently drop a whole subtree.
 */
export function buildServicePointTree(
  rows: ServicePointRow[],
): ServicePointTreeNode[] {
  const nodes = new Map<string, ServicePointTreeNode>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );

  const roots: ServicePointTreeNode[] = [];
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
