import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createAccount,
  findAccountById,
  listAccounts,
  softDeleteAccount,
  updateAccount,
} from '@repo/db';
import type {
  AccountListPage,
  AccountRow,
  ListAccountsOptions,
} from '@repo/db';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  /**
   * One page of accounts with optional search/type/status filters and
   * whitelist-validated sorting, plus the filtered total (the query itself
   * lives in @repo/db).
   */
  list(options: ListAccountsOptions): Promise<AccountListPage> {
    return listAccounts(options);
  }

  async get(id: string): Promise<AccountRow> {
    const account = await findAccountById(id);
    if (!account) throw new NotFoundException('Account not found.');
    return account;
  }

  async create(dto: CreateAccountDto): Promise<AccountRow> {
    const result = await createAccount(dto);
    if (result.ok) return result.account;
    throw new ConflictException('Account ID is already in use.');
  }

  async update(id: string, dto: UpdateAccountDto): Promise<AccountRow> {
    const result = await updateAccount(id, dto);
    if (result.ok) return result.account;

    if (result.error === 'account-id-taken') {
      throw new ConflictException('Account ID is already in use.');
    }
    throw new NotFoundException('Account not found.');
  }

  /** Soft delete; the row stays in place for referencing history. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteAccount(id);
    if (result.ok) return { id };
    throw new NotFoundException('Account not found.');
  }
}
