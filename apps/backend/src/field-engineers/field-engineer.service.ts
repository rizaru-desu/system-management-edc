import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createFieldEngineerProfile,
  deleteFieldEngineerProfile,
  findFieldEngineer,
  listAvailableFieldEngineerUsers,
  listFieldEngineers,
  listFieldEngineerWarehouseOptions,
  setFieldEngineerStatus,
  updateFieldEngineerProfile,
} from '@repo/db';
import type {
  AvailableFieldEngineerUser,
  FieldEngineerListPage,
  FieldEngineerRow,
  FieldEngineerWarehouseOption,
  FieldEngineerWriteError,
  ListFieldEngineersOptions,
} from '@repo/db';
import type {
  CreateFieldEngineerProfileDto,
  FieldEngineerStatusDto,
  UpdateFieldEngineerProfileDto,
} from './dto/profile.dto';

/** Human wording of the db layer's write rejections. */
function writeException(
  error: FieldEngineerWriteError,
):
  | BadRequestException
  | ConflictException
  | NotFoundException {
  switch (error) {
    case 'user-not-found':
      return new NotFoundException('User not found (or deactivated).');
    case 'not-field-engineer':
      return new BadRequestException(
        'This user does not hold the Field Service Engineer role — assign the role in Users & Roles first.',
      );
    case 'profile-exists':
      return new ConflictException(
        'This user already has a field engineer profile.',
      );
    case 'profile-not-found':
      return new NotFoundException('Field engineer profile not found.');
    case 'warehouse-not-found':
      return new BadRequestException(
        'The selected warehouse does not exist.',
      );
    case 'warehouse-not-active':
      return new BadRequestException(
        'The selected warehouse is not active.',
      );
  }
}

@Injectable()
export class FieldEngineerService {
  /**
   * One page of Field Engineer role users LEFT-joined with their work
   * profile (users without a profile appear with profile null — "Needs
   * Setup"), plus the filtered total.
   */
  list(options: ListFieldEngineersOptions): Promise<FieldEngineerListPage> {
    return listFieldEngineers(options);
  }

  /** Role holders without a profile — the "pick a user to onboard" feed. */
  availableUsers(): Promise<AvailableFieldEngineerUser[]> {
    return listAvailableFieldEngineerUsers();
  }

  /** Active warehouses for the profile form's dropdown. */
  warehouseOptions(): Promise<FieldEngineerWarehouseOption[]> {
    return listFieldEngineerWarehouseOptions();
  }

  async get(userId: string): Promise<FieldEngineerRow> {
    const engineer = await findFieldEngineer(userId);
    if (!engineer) {
      throw new NotFoundException(
        'Field engineer not found — the user does not exist or does not hold the Field Service Engineer role.',
      );
    }
    return engineer;
  }

  async create(dto: CreateFieldEngineerProfileDto): Promise<FieldEngineerRow> {
    const { userId, ...profile } = dto;
    const result = await createFieldEngineerProfile(userId, profile);
    if (result.ok) return result.engineer;
    throw writeException(result.error);
  }

  async update(
    userId: string,
    dto: UpdateFieldEngineerProfileDto,
  ): Promise<FieldEngineerRow> {
    const result = await updateFieldEngineerProfile(userId, dto);
    if (result.ok) return result.engineer;
    throw writeException(result.error);
  }

  /** Quick duty-status change from the list/detail. */
  async setStatus(
    userId: string,
    dto: FieldEngineerStatusDto,
  ): Promise<FieldEngineerRow> {
    const result = await setFieldEngineerStatus(userId, dto.status);
    if (result.ok) return result.engineer;
    throw writeException(result.error);
  }

  /**
   * Removes the work profile only — the underlying User account and its
   * Field Engineer role are untouched (Users & Roles owns those).
   */
  async remove(userId: string): Promise<{ userId: string }> {
    const result = await deleteFieldEngineerProfile(userId);
    if (result.ok) return { userId };
    throw writeException(result.error);
  }
}
