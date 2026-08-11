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
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type {
  MerchantOption,
  ProductOption,
  TerminalDetailRow,
  TerminalHistoryRow,
  TerminalListPage,
} from '@repo/db';
import { sessionUser } from '../auth/session-user';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateTerminalDto } from './dto/create-terminal.dto';
import { parseListTerminalsDto } from './dto/list-terminals.dto';
import { parseUpdateTerminalDto } from './dto/update-terminal.dto';
import { TerminalService } from './terminal.service';
import type { TerminalWarehouseOption } from './terminal.service';

/**
 * Terminal fleet data (Terminal Lifecycle → Terminals). Access follows the
 * role-permission matrix under the sidebar module key "terminals"; System
 * Administrators always pass.
 */
@Controller('terminals')
@RequirePermission('terminals', 'view')
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get()
  list(@Query() query: unknown): Promise<TerminalListPage> {
    return this.terminalService.list(parseListTerminalsDto(query));
  }

  /** Static segments declared before ':id' so the router never shadows them. */
  @Get('product-options')
  productOptions(): Promise<ProductOption[]> {
    return this.terminalService.productOptions();
  }

  @Get('warehouse-options')
  warehouseOptions(): Promise<TerminalWarehouseOption[]> {
    return this.terminalService.warehouseOptions();
  }

  @Get('merchant-options')
  merchantOptions(): Promise<MerchantOption[]> {
    return this.terminalService.merchantOptions();
  }

  /** The row plus its movement history (newest first, display-joined). */
  @Get(':id')
  get(@Param('id') id: string): Promise<TerminalDetailRow> {
    return this.terminalService.get(id);
  }

  /** Just the movement history, for lazy-loading the detail section. */
  @Get(':id/history')
  history(@Param('id') id: string): Promise<TerminalHistoryRow[]> {
    return this.terminalService.history(id);
  }

  @Post()
  @RequirePermission('terminals', 'create')
  create(
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<TerminalDetailRow> {
    return this.terminalService.create(
      parseCreateTerminalDto(body),
      sessionUser(session).id ?? null,
    );
  }

  @Patch(':id')
  @RequirePermission('terminals', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<TerminalDetailRow> {
    return this.terminalService.update(
      id,
      parseUpdateTerminalDto(body),
      sessionUser(session).id ?? null,
    );
  }

  @Delete(':id')
  @RequirePermission('terminals', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.terminalService.remove(id);
  }
}
