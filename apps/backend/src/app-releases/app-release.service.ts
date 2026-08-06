import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createMobileVersion,
  deleteMobileVersion,
  findMobileVersionById,
  listMobileVersions,
  setMobileVersionActive,
  updateMobileVersion,
} from '@repo/db';
import type {
  ListMobileVersionsOptions,
  MobileVersionAdminRow,
  MobileVersionListPage,
} from '@repo/db';
import type { CreateAppReleaseDto } from './dto/create-app-release.dto';
import type { UpdateAppReleaseDto } from './dto/update-app-release.dto';

@Injectable()
export class AppReleaseService {
  /**
   * One page of releases with optional search/platform/type/status filters
   * plus the filtered total (the query itself lives in @repo/db).
   */
  list(options: ListMobileVersionsOptions): Promise<MobileVersionListPage> {
    return listMobileVersions(options);
  }

  async get(id: string): Promise<MobileVersionAdminRow> {
    const release = await findMobileVersionById(id);
    if (!release) throw new NotFoundException('Release not found.');
    return release;
  }

  /**
   * Creates a release through the shared `createMobileVersion` query — when
   * the new record is active, that query deactivates the platform's previous
   * live release inside the same transaction.
   */
  async create(dto: CreateAppReleaseDto): Promise<MobileVersionAdminRow> {
    const created = await createMobileVersion(dto);
    return this.get(created.id);
  }

  async update(
    id: string,
    dto: UpdateAppReleaseDto,
  ): Promise<MobileVersionAdminRow> {
    const result = await updateMobileVersion(id, dto);
    if (!result.ok) throw new NotFoundException('Release not found.');
    return this.get(result.release.id);
  }

  /** Publishes (activates) or unpublishes the release for its platform. */
  async setPublished(
    id: string,
    isActive: boolean,
  ): Promise<MobileVersionAdminRow> {
    const result = await setMobileVersionActive(id, isActive);
    if (!result.ok) throw new NotFoundException('Release not found.');
    return this.get(result.release.id);
  }

  async remove(id: string): Promise<{ id: string }> {
    const result = await deleteMobileVersion(id);
    if (!result.ok) throw new NotFoundException('Release not found.');
    return { id };
  }
}
