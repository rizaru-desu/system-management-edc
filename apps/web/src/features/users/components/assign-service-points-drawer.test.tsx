import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { ServicePointRecord } from '#/features/service-points/index.ts'
import type {
  ServicePointAssignment,
  ServicePointRoleKey,
} from '../data/service-point-assignments.ts'
import type { UserRecord } from '../data/users.ts'
import { AssignServicePointsDrawer } from './assign-service-points-drawer.tsx'

const user: UserRecord = {
  id: 'user-1',
  name: 'Albert Einstein',
  email: 'albert@edc.co.id',
  roles: ['System_Administrator'],
  status: 'active',
  banReason: null,
  lastActiveAt: null,
  lastIp: null,
  lastUserAgent: null,
  signInMethods: ['credential'],
  createdAt: '2025-01-01',
}

function servicePoint(id: string, name: string): ServicePointRecord {
  return {
    id,
    code: id.toUpperCase(),
    name,
    parentId: null,
    region: 'DKI Jakarta',
    address: null,
    phone: null,
    email: null,
    latitude: null,
    longitude: null,
    coverageRadiusKm: null,
    status: 'active',
    notes: null,
    assignedUsers: 0,
    createdAt: '2025-01-01',
  }
}

const CATALOGUE = [
  servicePoint('jaksel', 'Jakarta Selatan'),
  servicePoint('bsd', 'BSD'),
  servicePoint('tgr', 'Tangerang'),
  servicePoint('bdg', 'Bandung'),
]

function assignment(
  servicePointId: string,
  roleAtServicePoint: ServicePointRoleKey,
  isDefault: boolean,
): ServicePointAssignment {
  return {
    id: `assignment-${servicePointId}`,
    userId: user.id,
    servicePointId,
    roleAtServicePoint,
    isDefault,
    assignedAt: '2025-02-10',
    status: 'active',
  }
}

function renderDrawer(
  overrides: Partial<
    React.ComponentProps<typeof AssignServicePointsDrawer>
  > = {},
) {
  const props = {
    user,
    open: true,
    onClose: vi.fn(),
    assignments: [] as Array<ServicePointAssignment>,
    assignmentsPending: false,
    assignmentsError: null,
    onRetry: vi.fn(),
    catalogue: CATALOGUE,
    onSave: vi.fn(),
    ...overrides,
  }
  const view = render(<AssignServicePointsDrawer {...props} />)
  return { props, view }
}

function defaultRadio(name: string) {
  return screen.getByRole('radio', {
    name: `Make ${name} the default`,
  })
}

afterEach(cleanup)

describe('AssignServicePointsDrawer', () => {
  it('loads stored assignments into the assigned panel with role and default preserved', () => {
    renderDrawer({
      assignments: [
        assignment('jaksel', 'leader', true),
        assignment('bsd', 'engineer', false),
        assignment('tgr', 'engineer', false),
      ],
    })

    // All three stored assignments render in the assigned panel…
    expect(screen.getByText('Jakarta Selatan')).toBeTruthy()
    expect(screen.getByText('BSD')).toBeTruthy()
    expect(screen.getByText('Tangerang')).toBeTruthy()
    expect(screen.getByText('3 service points assigned')).toBeTruthy()

    // …with the stored default intact (and only that one).
    expect(defaultRadio('Jakarta Selatan').getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(defaultRadio('BSD').getAttribute('aria-checked')).toBe('false')
    expect(defaultRadio('Tangerang').getAttribute('aria-checked')).toBe('false')

    // Assigned entries have left the available panel; the rest remain.
    // Available entries are the toggle buttons carrying aria-pressed.
    expect(
      screen.getByRole('button', { name: /Bandung/, pressed: false }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Jakarta Selatan/, pressed: false }),
    ).toBeNull()
  })

  it('shows the loader until assignments arrive, then seeds the editor', () => {
    const { view } = renderDrawer({ assignmentsPending: true })
    expect(screen.getByText('Loading assignments...')).toBeTruthy()
    expect(screen.queryByText('Assigned Service Points')).toBeNull()

    view.rerender(
      <AssignServicePointsDrawer
        user={user}
        open
        onClose={vi.fn()}
        assignments={[assignment('jaksel', 'leader', true)]}
        assignmentsPending={false}
        assignmentsError={null}
        onRetry={vi.fn()}
        catalogue={CATALOGUE}
        onSave={vi.fn()}
      />,
    )
    expect(screen.queryByText('Loading assignments...')).toBeNull()
    expect(screen.getByText('Jakarta Selatan')).toBeTruthy()
    expect(defaultRadio('Jakarta Selatan').getAttribute('aria-checked')).toBe(
      'true',
    )
  })

  it('allows Remove all and saves an empty assignment set', () => {
    const { props } = renderDrawer({
      assignments: [
        assignment('jaksel', 'leader', true),
        assignment('bsd', 'engineer', false),
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove all/ }))
    expect(screen.getByText('No service points assigned')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save assignments' }))
    expect(props.onSave).toHaveBeenCalledWith(user, [])
    expect(props.onClose).toHaveBeenCalled()
  })

  it('promotes another row to default when the default row is removed', () => {
    const onSave = vi.fn()
    renderDrawer({
      assignments: [
        assignment('jaksel', 'leader', true),
        assignment('bsd', 'engineer', false),
      ],
      onSave,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Jakarta Selatan' }),
    )
    expect(defaultRadio('BSD').getAttribute('aria-checked')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Save assignments' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][1] as Array<ServicePointAssignment>
    expect(saved).toHaveLength(1)
    expect(saved[0].servicePointId).toBe('bsd')
    expect(saved[0].isDefault).toBe(true)
  })

  it('changing the default updates the radios immediately and exclusively', () => {
    renderDrawer({
      assignments: [
        assignment('jaksel', 'leader', true),
        assignment('bsd', 'engineer', false),
      ],
    })

    fireEvent.click(defaultRadio('BSD'))
    expect(defaultRadio('BSD').getAttribute('aria-checked')).toBe('true')
    expect(defaultRadio('Jakarta Selatan').getAttribute('aria-checked')).toBe(
      'false',
    )
  })

  it('blocks saving while the default row is toggled inactive', () => {
    const { props } = renderDrawer({
      assignments: [
        assignment('jaksel', 'leader', true),
        assignment('bsd', 'engineer', false),
      ],
    })

    // The default (first) row's status switch → inactive.
    fireEvent.click(screen.getAllByRole('switch')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Save assignments' }))

    expect(
      screen.getByText(
        'The default service point must stay active — pick another default first.',
      ),
    ).toBeTruthy()
    expect(props.onSave).not.toHaveBeenCalled()
  })
})
