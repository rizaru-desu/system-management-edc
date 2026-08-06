import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseReplaceAssignmentsDto } from './dto/replace-assignments.dto';
import { ServicePointAssignmentService } from './service-point-assignment.service';
import type { UserAssignmentsPayload } from './service-point-assignment.service';

/**
 * A user's service point assignments, managed from the Users & Roles console
 * page — so access follows the "users" module of the role-permission matrix
 * rather than "service-points" (which governs the master data).
 */
@Controller('users/:userId/service-points')
@RequirePermission('users', 'view')
export class ServicePointAssignmentController {
  constructor(
    private readonly assignmentService: ServicePointAssignmentService,
  ) {}

  @Get()
  list(@Param('userId') userId: string): Promise<UserAssignmentsPayload> {
    return this.assignmentService.list(userId);
  }

  /** Full replace: the payload is the user's entire desired assignment set. */
  @Put()
  @RequirePermission('users', 'update')
  replace(
    @Param('userId') userId: string,
    @Body() body: unknown,
  ): Promise<UserAssignmentsPayload> {
    return this.assignmentService.replace(
      userId,
      parseReplaceAssignmentsDto(body),
    );
  }
}
