import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createMerchant,
  findMerchantById,
  listMerchants,
  softDeleteMerchant,
  updateMerchant,
} from '@repo/db';
import type {
  ListMerchantsOptions,
  MerchantListPage,
  MerchantRow,
} from '@repo/db';
import type { CreateMerchantDto } from './dto/create-merchant.dto';
import type { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantService {
  /**
   * One page of merchants with optional search/status/service point filters
   * and whitelist-validated sorting, plus the filtered total (the query
   * itself lives in @repo/db).
   */
  list(options: ListMerchantsOptions): Promise<MerchantListPage> {
    return listMerchants(options);
  }

  async get(id: string): Promise<MerchantRow> {
    const merchant = await findMerchantById(id);
    if (!merchant) throw new NotFoundException('Merchant not found.');
    return merchant;
  }

  async create(dto: CreateMerchantDto): Promise<MerchantRow> {
    const result = await createMerchant(dto);
    if (result.ok) return result.merchant;

    if (result.error === 'code-taken') {
      throw new ConflictException('Merchant code is already in use.');
    }
    throw new BadRequestException('Service point not found.');
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantRow> {
    const result = await updateMerchant(id, dto);
    if (result.ok) return result.merchant;

    switch (result.error) {
      case 'code-taken':
        throw new ConflictException('Merchant code is already in use.');
      case 'service-point-not-found':
        throw new BadRequestException('Service point not found.');
      default:
        throw new NotFoundException('Merchant not found.');
    }
  }

  /** Soft delete; the row stays in place for referencing history. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteMerchant(id);
    if (result.ok) return { id };
    throw new NotFoundException('Merchant not found.');
  }
}
