import type { ServicePointRow } from '@repo/db';
import { buildServicePointTree } from './tree-builder.util';

function row(id: string, parentId: string | null): ServicePointRow {
  return {
    id,
    parentId,
    code: id.toUpperCase(),
    name: id,
    region: null,
    address: null,
    phone: null,
    email: null,
    latitude: null,
    longitude: null,
    notes: null,
    status: 'ACTIVE',
    assignedUsers: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };
}

describe('buildServicePointTree', () => {
  it('nests children under their parents with unlimited depth', () => {
    const tree = buildServicePointTree([
      row('ho', null),
      row('jkt', 'ho'),
      row('jkt-sel', 'jkt'),
      row('kebayoran', 'jkt-sel'),
      row('bdg', 'ho'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('ho');
    expect(tree[0].children.map((node) => node.id)).toEqual(['jkt', 'bdg']);
    expect(tree[0].children[0].children[0].id).toBe('jkt-sel');
    expect(tree[0].children[0].children[0].children[0].id).toBe('kebayoran');
  });

  it('keeps multiple roots and preserves input order among siblings', () => {
    const tree = buildServicePointTree([
      row('a', null),
      row('b', null),
      row('a1', 'a'),
      row('a2', 'a'),
    ]);

    expect(tree.map((node) => node.id)).toEqual(['a', 'b']);
    expect(tree[0].children.map((node) => node.id)).toEqual(['a1', 'a2']);
  });

  it('promotes rows with a missing parent to roots instead of dropping them', () => {
    const tree = buildServicePointTree([
      row('orphan', 'gone'),
      row('child-of-orphan', 'orphan'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('orphan');
    expect(tree[0].children[0].id).toBe('child-of-orphan');
  });

  it('returns an empty forest for no rows', () => {
    expect(buildServicePointTree([])).toEqual([]);
  });
});
