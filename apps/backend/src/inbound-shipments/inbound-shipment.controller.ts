import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type {
  DiscrepancyReport,
  InboundShipmentDetailRow,
  InboundShipmentListPage,
  ItemCategoryOption,
  ParentShipmentOption,
  PartnerOption,
  ProductOption,
  ProjectAllocationOption,
} from '@repo/db';
import { sessionUser } from '../auth/session-user';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateInboundShipmentDto } from './dto/create-inbound-shipment.dto';
import {
  parseConfirmDiscrepancyDto,
  parseResolveDiscrepancyDto,
  parseSendDiscrepancyReportDto,
} from './dto/discrepancy.dto';
import {
  parseAddEdcItemDto,
  parseUpdateEdcItemDto,
  parseUpdatePeripheralItemDto,
} from './dto/inspection.dto';
import { parseListInboundShipmentsDto } from './dto/list-inbound-shipments.dto';
import { parseUpdateInboundShipmentDto } from './dto/update-inbound-shipment.dto';
import { InboundShipmentService } from './inbound-shipment.service';
import type {
  FinalizeInspectionResponse,
  ShipmentWarehouseOption,
} from './inbound-shipment.service';

/**
 * Inbound Shipment & Inspection (Terminal Lifecycle → Inbound Shipments).
 * Access follows the role-permission matrix under the sidebar module key
 * "inbound-shipments"; System Administrators always pass. Recording the
 * paperwork needs "create", inspecting needs "update", and finalizing —
 * which creates terminals and moves stock — needs "update" as well.
 */
@Controller('inbound-shipments')
@RequirePermission('inbound-shipments', 'view')
export class InboundShipmentController {
  constructor(
    private readonly inboundShipmentService: InboundShipmentService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<InboundShipmentListPage> {
    return this.inboundShipmentService.list(
      parseListInboundShipmentsDto(query),
    );
  }

  /** Static segments declared before ':id' so the router never shadows them. */
  @Get('partner-options')
  partnerOptions(): Promise<PartnerOption[]> {
    return this.inboundShipmentService.partnerOptions();
  }

  @Get('product-options')
  productOptions(): Promise<ProductOption[]> {
    return this.inboundShipmentService.productOptions();
  }

  @Get('warehouse-options')
  warehouseOptions(): Promise<ShipmentWarehouseOption[]> {
    return this.inboundShipmentService.warehouseOptions();
  }

  @Get('item-options')
  itemOptions(): Promise<ItemCategoryOption[]> {
    return this.inboundShipmentService.itemOptions();
  }

  /** DOs with an unresolved discrepancy — the "follow-up of" choices. */
  @Get('parent-options')
  parentOptions(): Promise<ParentShipmentOption[]> {
    return this.inboundShipmentService.parentShipmentOptions();
  }

  /** Active projects — the wizard's stock-allocation choices. */
  @Get('project-options')
  projectOptions(): Promise<ProjectAllocationOption[]> {
    return this.inboundShipmentService.projectOptions();
  }

  /** The header plus both manifests and every unit's checklist. */
  @Get(':id')
  get(@Param('id') id: string): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.get(id);
  }

  /** Structured discrepancy data behind the report modal. */
  @Get(':id/discrepancy-report')
  discrepancyReport(@Param('id') id: string): Promise<DiscrepancyReport> {
    return this.inboundShipmentService.discrepancyReport(id);
  }

  @Post()
  @RequirePermission('inbound-shipments', 'create')
  create(@Body() body: unknown): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.create(
      parseCreateInboundShipmentDto(body),
    );
  }

  /** Full replacement of the header and manifests (pre-inspection only). */
  @Put(':id')
  @RequirePermission('inbound-shipments', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.update(
      id,
      parseUpdateInboundShipmentDto(body),
    );
  }

  /** One unit's inspection result; returns the refreshed shipment. */
  @Patch(':id/edc-items/:itemId')
  @RequirePermission('inbound-shipments', 'update')
  updateEdcItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.updateEdcItem(
      id,
      itemId,
      parseUpdateEdcItemDto(body),
    );
  }

  /** A serial found physically but absent from the manifest. */
  @Post(':id/edc-items')
  @RequirePermission('inbound-shipments', 'update')
  addEdcItem(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.addEdcItem(id, parseAddEdcItemDto(body));
  }

  @Patch(':id/peripheral-items/:itemId')
  @RequirePermission('inbound-shipments', 'update')
  updatePeripheralItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.updatePeripheralItem(
      id,
      itemId,
      parseUpdatePeripheralItemDto(body),
    );
  }

  /**
   * Closes the inspection — creates the terminals, moves the stock and
   * completes the shipment in one transaction. The acting user is stamped
   * on every terminal's registration history row.
   */
  @Post(':id/finalize')
  @RequirePermission('inbound-shipments', 'update')
  finalize(
    @Param('id') id: string,
    @Session() session: UserSession,
  ): Promise<FinalizeInspectionResponse> {
    return this.inboundShipmentService.finalize(
      id,
      sessionUser(session).id ?? null,
    );
  }

  /**
   * Emails the discrepancy report to the partner (PIC email by default)
   * and advances the case to REPORTED.
   */
  @Post(':id/discrepancy/send')
  @RequirePermission('inbound-shipments', 'update')
  sendDiscrepancyReport(
    @Param('id') id: string,
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.sendDiscrepancyReport(
      id,
      sessionUser(session).id ?? null,
      parseSendDiscrepancyReportDto(body),
    );
  }

  /** Records the partner's answer to the discrepancy report. */
  @Post(':id/discrepancy/confirm')
  @RequirePermission('inbound-shipments', 'update')
  confirmDiscrepancy(
    @Param('id') id: string,
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.confirmDiscrepancy(
      id,
      sessionUser(session).id ?? null,
      parseConfirmDiscrepancyDto(body),
    );
  }

  /** Closes the discrepancy case by hand. */
  @Post(':id/discrepancy/resolve')
  @RequirePermission('inbound-shipments', 'update')
  resolveDiscrepancy(
    @Param('id') id: string,
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<InboundShipmentDetailRow> {
    return this.inboundShipmentService.resolveDiscrepancy(
      id,
      sessionUser(session).id ?? null,
      parseResolveDiscrepancyDto(body),
    );
  }
}
