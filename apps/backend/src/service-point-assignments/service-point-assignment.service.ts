import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  findUserListItem,
  listUserServicePointAssignments,
  replaceUserServicePointAssignments,
} from '@repo/db';
import type { UserAssignmentRow } from '@repo/db';
import type { ReplaceAssignmentsDto } from './dto/replace-assignments.dto';

/** Response wrapper of both assignment endpoints. */
export interface UserAssignmentsPayload {
  assignments: UserAssignmentRow[];
}

/**
 * User ⇄ service point assignment (many-to-many). Kept generic — no
 * business-module logic — so task management, maintenance, settlement, and
 * the other planned modules can all build on the same assignment data.
 */
@Injectable()
export class ServicePointAssignmentService {
  /** The user's ACTIVE assignments with their service point summaries. */
  async list(userId: string): Promise<UserAssignmentsPayload> {
    // Existence is validated explicitly so an unknown user is a 404, not an
    // indistinguishable empty list.
    const user = await findUserListItem(userId);
    if (!user) throw new NotFoundException('User not found.');

    return { assignments: await listUserServicePointAssignments(userId) };
  }

  /**
   * Replaces the user's assignment set in one transaction (create new,
   * update existing, soft-unassign removed). Payload-shape rules are already
   * enforced by the DTO; the db layer re-checks referential integrity.
   */
  async replace(
    userId: string,
    dto: ReplaceAssignmentsDto,
  ): Promise<UserAssignmentsPayload> {
    const result = await replaceUserServicePointAssignments(
      userId,
      dto.assignments,
    );
    if (result.ok) return { assignments: result.assignments };

    if (result.error === 'service-point-not-found') {
      throw new BadRequestException(
        `Unknown service point id(s): ${result.missingIds.join(', ')}.`,
      );
    }
    throw new NotFoundException('User not found.');
  }
}
