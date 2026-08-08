import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-project.ts'
import type { ProjectPayload } from './create-project.ts'
import {
  isDuplicateCodeError,
  projectError,
  projectsQueryKey,
  toBackendStatus,
  toProjectRecord,
} from './list-projects.ts'
import type { BackendProject } from './list-projects.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'

/**
 * Updates a project through PATCH /projects/:id (gated by the
 * projects-module "update" grant). Code uniqueness is re-validated
 * server-side.
 */
const updateProjectFn = createServerFn({ method: 'POST' })
  .validator((input: ProjectPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendProject>(
        `projects/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toProjectRecord(response.data)
    } catch (err: unknown) {
      throw projectError(err, 'Failed to update the project')
    }
  })

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectPayload & { id: string }) =>
      updateProjectFn({ data: input }),
    onSuccess: (project) => {
      toast.success(`Project “${project.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('Project code is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the project.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}

/**
 * Status-only PATCH for the table's Activate/Deactivate action — same
 * endpoint as the edit form, but a dedicated server fn so the request body
 * carries nothing except the status flip.
 */
const setProjectStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; status: ProjectStatus }) => input)
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendProject>(
        `projects/${encodeURIComponent(data.id)}`,
        { status: toBackendStatus(data.status) },
        { headers: { cookie } },
      )
      return toProjectRecord(response.data)
    } catch (err: unknown) {
      throw projectError(err, 'Failed to change the project status')
    }
  })

/** Mutation for the Activate/Deactivate dialog; the list refetches on settle. */
export function useSetProjectStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: ProjectStatus }) =>
      setProjectStatusFn({ data: input }),
    onSuccess: (project) => {
      toast.success(
        project.status === 'active'
          ? `Project “${project.name}” activated.`
          : `Project “${project.name}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the project status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}
