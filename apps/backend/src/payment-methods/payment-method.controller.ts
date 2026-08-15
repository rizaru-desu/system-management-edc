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
  PaymentMethodListPage,
  PaymentMethodOption,
  PaymentMethodRow,
} from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { parseListPaymentMethodsDto } from './dto/list-payment-methods.dto';
import { parseUpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodService } from './payment-method.service';

/**
 * Payment Methods master data (Administration → Payment Methods). Access
 * follows the role-permission matrix under the sidebar module key
 * "payment-methods"; System Administrators always pass.
 */
@Controller('payment-methods')
@RequirePermission('payment-methods', 'view')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Get()
  list(@Query() query: unknown): Promise<PaymentMethodListPage> {
    return this.paymentMethodService.list(parseListPaymentMethodsDto(query));
  }

  /**
   * Active methods only, for dropdowns. A static segment declared before
   * ':id' so the router never shadows it.
   */
  @Get('active')
  active(): Promise<PaymentMethodOption[]> {
    return this.paymentMethodService.active();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<PaymentMethodRow> {
    return this.paymentMethodService.get(id);
  }

  @Post()
  @RequirePermission('payment-methods', 'create')
  create(@Body() body: unknown): Promise<PaymentMethodRow> {
    return this.paymentMethodService.create(parseCreatePaymentMethodDto(body));
  }

  @Patch(':id')
  @RequirePermission('payment-methods', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PaymentMethodRow> {
    return this.paymentMethodService.update(
      id,
      parseUpdatePaymentMethodDto(body),
    );
  }

  @Patch(':id/toggle-status')
  @RequirePermission('payment-methods', 'update')
  toggleStatus(@Param('id') id: string): Promise<PaymentMethodRow> {
    return this.paymentMethodService.toggleStatus(id);
  }

  /** Refused while any live product still links the method. */
  @Delete(':id')
  @RequirePermission('payment-methods', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.paymentMethodService.remove(id);
  }
}
