import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { ProjectListPage, ProjectRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateProjectDto } from './dto/create-project.dto';
import { parseProjectFilterDto } from './dto/project-filter.dto';
import { parseUpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

/**
 * Project master data (Contract Management → Projects). Access follows the
 * role-permission matrix under the sidebar module key "projects"; System
 * Administrators always pass.
 */
@Controller('projects')
@RequirePermission('projects', 'view')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  list(@Query() query: unknown): Promise<ProjectListPage> {
    return this.projectService.list(parseProjectFilterDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ProjectRow> {
    return this.projectService.get(id);
  }

  @Post()
  @RequirePermission('projects', 'create')
  create(@Body() body: unknown): Promise<ProjectRow> {
    return this.projectService.create(parseCreateProjectDto(body));
  }

  @Patch(':id')
  @RequirePermission('projects', 'update')
  update(@Param('id') id: string, @Body() body: unknown): Promise<ProjectRow> {
    return this.projectService.update(id, parseUpdateProjectDto(body));
  }

  @Delete(':id')
  @RequirePermission('projects', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.projectService.remove(id);
  }
}
