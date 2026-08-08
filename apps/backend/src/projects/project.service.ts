import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createProject,
  findProjectById,
  listProjects,
  softDeleteProject,
  updateProject,
} from '@repo/db';
import type {
  ListProjectsOptions,
  ProjectListPage,
  ProjectRow,
} from '@repo/db';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  /**
   * One page of projects with optional search/status filters and
   * whitelist-validated sorting, plus the filtered total (the query itself
   * lives in @repo/db).
   */
  list(options: ListProjectsOptions): Promise<ProjectListPage> {
    return listProjects(options);
  }

  async get(id: string): Promise<ProjectRow> {
    const project = await findProjectById(id);
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<ProjectRow> {
    const result = await createProject(dto);
    if (result.ok) return result.project;
    throw new ConflictException('Project code is already in use.');
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectRow> {
    const result = await updateProject(id, dto);
    if (result.ok) return result.project;

    if (result.error === 'code-taken') {
      throw new ConflictException('Project code is already in use.');
    }
    throw new NotFoundException('Project not found.');
  }

  /** Soft delete; the row stays in place for referencing history. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteProject(id);
    if (result.ok) return { id };
    throw new NotFoundException('Project not found.');
  }
}
