import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createMobileVersion,
  deleteMobileVersion,
  findMobileVersionById,
  isMobileVersionAvailable,
  listMobileVersions,
  setMobileVersionActive,
  updateMobileVersion,
} from '@repo/db';
import type {
  ListMobileVersionsOptions,
  MobileVersionAdminRow,
  MobileVersionIdentity,
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
   * The 409 body of a duplicate (platform, updateType, versionName,
   * versionCode) combination — shared by create and update so the response
   * shape never drifts.
   */
  private static duplicateVersionException(): ConflictException {
    return new ConflictException({
      success: false,
      message: 'Version already exists.',
    });
  }

  /**
   * True when no release uses the identity combination yet — the add/edit
   * form's live availability check (`excludeId` skips the edited record).
   */
  async checkAvailability(
    identity: MobileVersionIdentity,
  ): Promise<{ available: boolean }> {
    return { available: await isMobileVersionAvailable(identity) };
  }

  /**
   * Creates a release through the shared `createMobileVersion` query — the
   * duplicate-identity check and the "one active release per platform"
   * deactivation both run inside that query's transaction.
   */
  async create(dto: CreateAppReleaseDto): Promise<MobileVersionAdminRow> {
    const result = await createMobileVersion(dto);
    if (!result.ok) throw AppReleaseService.duplicateVersionException();
    return this.get(result.release.id);
  }

  async update(
    id: string,
    dto: UpdateAppReleaseDto,
  ): Promise<MobileVersionAdminRow> {
    const result = await updateMobileVersion(id, dto);
    if (!result.ok) {
      if (result.error === 'version-exists') {
        throw AppReleaseService.duplicateVersionException();
      }
      throw new NotFoundException('Release not found.');
    }
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
