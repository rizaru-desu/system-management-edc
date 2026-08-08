import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateCodeError,
  projectError,
  projectsQueryKey,
  toBackendStatus,
  toProjectRecord,
} from './list-projects.ts'
import type { BackendProject } from './list-projects.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface ProjectPayload {
  code: string
  name: string
  description: string | null
  status: ProjectStatus
}

/** Frontend payload → the backend DTO (column names + uppercase status). */
export function toBackendPayload(payload: ProjectPayload) {
  return {
    projectCode: payload.code,
    projectName: payload.name,
    description: payload.description,
    status: toBackendStatus(payload.status),
  }
}

/**
 * Creates a project through POST /projects (gated by the projects-module
 * "create" grant). Code uniqueness is validated server-side; 409 = project
 * code already in use.
 */
const createProjectFn = createServerFn({ method: 'POST' })
  .validator((input: ProjectPayload) => input)
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendProject>(
        'projects',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toProjectRecord(response.data)
    } catch (err: unknown) {
      throw projectError(err, 'Failed to create the project')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts. A duplicate-code 409 additionally gets an inline highlight via
 * the form's conflict counter (see the page).
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectPayload) => createProjectFn({ data: input }),
    onSuccess: (project) => {
      toast.success(`Project “${project.name}” created.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('Project code is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the project.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}
