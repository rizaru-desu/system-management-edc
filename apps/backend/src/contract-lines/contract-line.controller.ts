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
import type { ContractLineListPage, ContractLineRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseContractLineFilterDto } from './dto/contract-line-filter.dto';
import { parseCreateContractLineDto } from './dto/create-contract-line.dto';
import { parseUpdateContractLineDto } from './dto/update-contract-line.dto';
import { ContractLineService } from './contract-line.service';

/**
 * Contract line master data (Contract Management → Contract Lines). Access
 * follows the role-permission matrix under the sidebar module key
 * "contract-lines"; System Administrators always pass.
 */
@Controller('contract-lines')
@RequirePermission('contract-lines', 'view')
export class ContractLineController {
  constructor(private readonly contractLineService: ContractLineService) {}

  @Get()
  list(@Query() query: unknown): Promise<ContractLineListPage> {
    return this.contractLineService.list(parseContractLineFilterDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ContractLineRow> {
    return this.contractLineService.get(id);
  }

  @Post()
  @RequirePermission('contract-lines', 'create')
  create(@Body() body: unknown): Promise<ContractLineRow> {
    return this.contractLineService.create(parseCreateContractLineDto(body));
  }

  @Patch(':id')
  @RequirePermission('contract-lines', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ContractLineRow> {
    return this.contractLineService.update(
      id,
      parseUpdateContractLineDto(body),
    );
  }

  @Delete(':id')
  @RequirePermission('contract-lines', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.contractLineService.remove(id);
  }
}
