import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createContractLine,
  findContractLineById,
  listContractLines,
  softDeleteContractLine,
  updateContractLine,
} from '@repo/db';
import type {
  ContractLineListPage,
  ContractLineRow,
  ListContractLinesOptions,
} from '@repo/db';
import type { CreateContractLineDto } from './dto/create-contract-line.dto';
import type { UpdateContractLineDto } from './dto/update-contract-line.dto';

@Injectable()
export class ContractLineService {
  /**
   * One page of contract lines with optional search/status/document
   * status/account/project filters and whitelist-validated sorting, plus
   * the filtered total (the query itself lives in @repo/db, joining the
   * owning account and project).
   */
  list(options: ListContractLinesOptions): Promise<ContractLineListPage> {
    return listContractLines(options);
  }

  async get(id: string): Promise<ContractLineRow> {
    const contractLine = await findContractLineById(id);
    if (!contractLine) throw new NotFoundException('Contract line not found.');
    return contractLine;
  }

  async create(dto: CreateContractLineDto): Promise<ContractLineRow> {
    const result = await createContractLine(dto);
    if (result.ok) return result.contractLine;

    switch (result.error) {
      case 'line-number-taken':
        throw new ConflictException('Line number is already in use.');
      case 'account-not-found':
        throw new BadRequestException('Account not found.');
      default:
        throw new BadRequestException('Project not found.');
    }
  }

  async update(
    id: string,
    dto: UpdateContractLineDto,
  ): Promise<ContractLineRow> {
    const result = await updateContractLine(id, dto);
    if (result.ok) return result.contractLine;

    switch (result.error) {
      case 'line-number-taken':
        throw new ConflictException('Line number is already in use.');
      case 'account-not-found':
        throw new BadRequestException('Account not found.');
      case 'project-not-found':
        throw new BadRequestException('Project not found.');
      default:
        throw new NotFoundException('Contract line not found.');
    }
  }

  /** Soft delete; the row stays in place for referencing history. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteContractLine(id);
    if (result.ok) return { id };
    throw new NotFoundException('Contract line not found.');
  }
}
