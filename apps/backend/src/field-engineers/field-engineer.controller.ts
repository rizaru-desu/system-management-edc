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
import type {
  AvailableFieldEngineerUser,
  FieldEngineerListPage,
  FieldEngineerRow,
  FieldEngineerWarehouseOption,
} from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseListFieldEngineersDto } from './dto/list-field-engineers.dto';
import {
  parseCreateFieldEngineerProfileDto,
  parseFieldEngineerStatusDto,
  parseUpdateFieldEngineerProfileDto,
} from './dto/profile.dto';
import { FieldEngineerService } from './field-engineer.service';

/**
 * Field Engineers (Service Operations → Field Engineers). Surfaces Users
 * holding the Field_Service_Engineer role with their work profile; it
 * never creates or edits the users themselves. Access follows the
 * role-permission matrix under the sidebar module key "engineers";
 * System Administrators always pass.
 */
@Controller('field-engineers')
@RequirePermission('engineers', 'view')
export class FieldEngineerController {
  constructor(private readonly fieldEngineerService: FieldEngineerService) {}

  @Get()
  list(@Query() query: unknown): Promise<FieldEngineerListPage> {
    return this.fieldEngineerService.list(parseListFieldEngineersDto(query));
  }

  /**
   * Role holders without a profile yet — the "pick a user to onboard"
   * feed. A static segment declared before ':userId' so the router never
   * shadows it.
   */
  @Get('available-users')
  availableUsers(): Promise<AvailableFieldEngineerUser[]> {
    return this.fieldEngineerService.availableUsers();
  }

  /** Active warehouses for the profile form, under this module's grant. */
  @Get('warehouse-options')
  warehouseOptions(): Promise<FieldEngineerWarehouseOption[]> {
    return this.fieldEngineerService.warehouseOptions();
  }

  @Get(':userId')
  get(@Param('userId') userId: string): Promise<FieldEngineerRow> {
    return this.fieldEngineerService.get(userId);
  }

  @Post()
  @RequirePermission('engineers', 'create')
  create(@Body() body: unknown): Promise<FieldEngineerRow> {
    return this.fieldEngineerService.create(
      parseCreateFieldEngineerProfileDto(body),
    );
  }

  @Patch(':userId')
  @RequirePermission('engineers', 'update')
  update(
    @Param('userId') userId: string,
    @Body() body: unknown,
  ): Promise<FieldEngineerRow> {
    return this.fieldEngineerService.update(
      userId,
      parseUpdateFieldEngineerProfileDto(body),
    );
  }

  @Patch(':userId/status')
  @RequirePermission('engineers', 'update')
  setStatus(
    @Param('userId') userId: string,
    @Body() body: unknown,
  ): Promise<FieldEngineerRow> {
    return this.fieldEngineerService.setStatus(
      userId,
      parseFieldEngineerStatusDto(body),
    );
  }

  /** Removes the work profile only; the User account stays untouched. */
  @Delete(':userId')
  @RequirePermission('engineers', 'delete')
  remove(@Param('userId') userId: string): Promise<{ userId: string }> {
    return this.fieldEngineerService.remove(userId);
  }
}
