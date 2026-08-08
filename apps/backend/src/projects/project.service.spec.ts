import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createProject,
  findProjectById,
  listProjects,
  softDeleteProject,
  updateProject,
} from '@repo/db';
import type { ProjectRow } from '@repo/db';
import { ProjectService } from './project.service';

jest.mock('@repo/db', () => ({
  createProject: jest.fn(),
  findProjectById: jest.fn(),
  listProjects: jest.fn(),
  softDeleteProject: jest.fn(),
  updateProject: jest.fn(),
}));

const listMock = listProjects as jest.MockedFunction<typeof listProjects>;
const findMock = findProjectById as jest.MockedFunction<typeof findProjectById>;
const createMock = createProject as jest.MockedFunction<typeof createProject>;
const updateMock = updateProject as jest.MockedFunction<typeof updateProject>;
const deleteMock = softDeleteProject as jest.MockedFunction<
  typeof softDeleteProject
>;

const project: ProjectRow = {
  id: 'prj1',
  projectCode: 'PRJ-0001',
  projectName: 'EDC Rollout Jabodetabek',
  description: 'Terminal deployment wave for greater Jakarta merchants.',
  status: 'ACTIVE',
  contractLineCount: 1,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

const input = {
  projectCode: 'PRJ-0001',
  projectName: 'EDC Rollout Jabodetabek',
  description: 'Terminal deployment wave for greater Jakarta merchants.',
  status: 'ACTIVE' as const,
};

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService();
  });

  describe('list', () => {
    it('passes pagination, search, filter and sort options through', async () => {
      const page = { projects: [project], total: 1 };
      listMock.mockResolvedValue(page);

      const options = {
        search: 'rollout',
        status: 'ACTIVE' as const,
        sortBy: 'projectName' as const,
        sortOrder: 'asc' as const,
        page: 2,
        pageSize: 25,
      };
      await expect(service.list(options)).resolves.toBe(page);
      expect(listMock).toHaveBeenCalledWith(options);
    });
  });

  describe('get', () => {
    it('returns the project when found', async () => {
      findMock.mockResolvedValue(project);
      await expect(service.get('prj1')).resolves.toBe(project);
    });

    it('throws 404 when unknown or soft-deleted', async () => {
      findMock.mockResolvedValue(null);
      await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('returns the created project', async () => {
      createMock.mockResolvedValue({ ok: true, project });
      await expect(service.create(input)).resolves.toBe(project);
      expect(createMock).toHaveBeenCalledWith(input);
    });

    it('throws 409 on a duplicate projectCode', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'code-taken' });
      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('returns the updated project', async () => {
      updateMock.mockResolvedValue({ ok: true, project });
      await expect(
        service.update('prj1', { projectName: 'Renamed' }),
      ).resolves.toBe(project);
      expect(updateMock).toHaveBeenCalledWith('prj1', {
        projectName: 'Renamed',
      });
    });

    it('throws 409 on a duplicate projectCode', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'code-taken' });
      await expect(
        service.update('prj1', { projectCode: 'PRJ-0002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 404 when the project does not exist', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(
        service.update('nope', { projectName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and returns the id', async () => {
      deleteMock.mockResolvedValue({ ok: true });
      await expect(service.remove('prj1')).resolves.toEqual({ id: 'prj1' });
      expect(deleteMock).toHaveBeenCalledWith('prj1');
    });

    it('throws 404 when the project does not exist', async () => {
      deleteMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
