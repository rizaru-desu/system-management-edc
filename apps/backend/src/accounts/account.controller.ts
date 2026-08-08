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
import type { AccountListPage, AccountRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseAccountFilterDto } from './dto/account-filter.dto';
import { parseCreateAccountDto } from './dto/create-account.dto';
import { parseUpdateAccountDto } from './dto/update-account.dto';
import { AccountService } from './account.service';

/**
 * Account master data (Contract Management → Account). Access follows the
 * role-permission matrix under the sidebar module key "accounts"; System
 * Administrators always pass.
 */
@Controller('accounts')
@RequirePermission('accounts', 'view')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  list(@Query() query: unknown): Promise<AccountListPage> {
    return this.accountService.list(parseAccountFilterDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<AccountRow> {
    return this.accountService.get(id);
  }

  @Post()
  @RequirePermission('accounts', 'create')
  create(@Body() body: unknown): Promise<AccountRow> {
    return this.accountService.create(parseCreateAccountDto(body));
  }

  @Patch(':id')
  @RequirePermission('accounts', 'update')
  update(@Param('id') id: string, @Body() body: unknown): Promise<AccountRow> {
    return this.accountService.update(id, parseUpdateAccountDto(body));
  }

  @Delete(':id')
  @RequirePermission('accounts', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.accountService.remove(id);
  }
}
