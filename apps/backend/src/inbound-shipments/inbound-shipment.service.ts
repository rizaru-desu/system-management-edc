import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addUnlistedEdcItem,
  buildDiscrepancyReport,
  confirmDiscrepancy,
  createInboundShipment,
  finalizeInboundShipment,
  findInboundShipmentById,
  listAllWarehouses,
  listInboundShipments,
  listItemCategoryOptions,
  listParentShipmentOptions,
  listPartnerOptions,
  listProductOptions,
  markDiscrepancyReported,
  resolveDiscrepancy,
  updateInboundShipment,
  updateInboundShipmentEdcItem,
  updateInboundShipmentPeripheralItem,
} from '@repo/db';
import type {
  DiscrepancyActionError,
  DiscrepancyReport,
  FinalizeInspectionSummary,
  InboundShipmentDetailRow,
  InboundShipmentListPage,
  InboundShipmentWriteError,
  ItemCategoryOption,
  ListInboundShipmentsOptions,
  ParentShipmentOption,
  PartnerOption,
  ProductOption,
  WarehouseRow,
} from '@repo/db';
import { MailService } from '../mail/mail.service';
import { buildWarehouseTree } from '../warehouses/utils/tree-builder.util';
import type { WarehouseTreeNode } from '../warehouses/utils/tree-builder.util';
import type { CreateInboundShipmentDto } from './dto/create-inbound-shipment.dto';
import type {
  ConfirmDiscrepancyDto,
  ResolveDiscrepancyDto,
  SendDiscrepancyReportDto,
} from './dto/discrepancy.dto';
import type {
  AddEdcItemDto,
  UpdateEdcItemDto,
  UpdatePeripheralItemDto,
} from './dto/inspection.dto';
import type { UpdateInboundShipmentDto } from './dto/update-inbound-shipment.dto';

/** One warehouse dropdown option, in tree order with its nesting depth. */
export interface ShipmentWarehouseOption {
  id: string;
  name: string;
  code: string;
  type: WarehouseRow['type'];
  /** 0 = Central level; drives the indentation in the dropdown. */
  depth: number;
}

/** The finalize response: what the transaction created plus the shipment. */
export interface FinalizeInspectionResponse {
  summary: FinalizeInspectionSummary;
  shipment: InboundShipmentDetailRow;
}

/** Human wording of the shared write violations. */
function writeException(
  error: InboundShipmentWriteError,
): ConflictException | BadRequestException {
  switch (error) {
    case 'do-number-taken':
      return new ConflictException('DO number is already in use.');
    case 'duplicate-serial':
      return new ConflictException(
        'The same serial number appears twice on this shipment.',
      );
    case 'duplicate-item':
      return new BadRequestException(
        'The same peripheral item is listed twice — merge the quantities into one line.',
      );
    case 'partner-not-found':
      return new BadRequestException('Partner account not found.');
    case 'warehouse-not-found':
      return new BadRequestException('Destination warehouse not found.');
    case 'product-not-found':
      return new BadRequestException('Product not found.');
    case 'item-category-not-found':
      return new BadRequestException('Item category not found.');
    case 'serial-registered':
      return new ConflictException(
        'A terminal with this serial number is already registered.',
      );
    case 'shipment-locked':
      return new ConflictException(
        'This shipment can no longer be edited — its inspection has already started or been finalized.',
      );
    case 'parent-not-found':
      return new BadRequestException('Parent shipment not found.');
    case 'parent-self':
      return new BadRequestException(
        'A shipment cannot be recorded as its own follow-up.',
      );
  }
}

/** Human wording of the discrepancy-step violations. */
function discrepancyException(
  error: DiscrepancyActionError,
): NotFoundException | BadRequestException | ConflictException {
  switch (error) {
    case 'not-found':
      return new NotFoundException('Inbound shipment not found.');
    case 'not-finalized':
      return new BadRequestException(
        'The inspection must be finalized before its discrepancies can be followed up.',
      );
    case 'no-discrepancies':
      return new BadRequestException(
        'This shipment closed clean — there is no discrepancy to follow up.',
      );
    case 'already-resolved':
      return new ConflictException(
        'This discrepancy case has already been resolved.',
      );
  }
}

/** One unit row as the report email template consumes it. */
function emailUnit(unit: DiscrepancyReport['missingUnits'][number]) {
  return {
    serialNumber: unit.serialNumber,
    product: `${unit.productBrand} ${unit.productModelName}`,
    notes: unit.notes ?? '—',
  };
}

/**
 * The handlebars context of templates/discrepancy-report.hbs. Every key
 * the template references is always present (it renders in strict mode).
 */
function reportEmailContext(report: DiscrepancyReport, message: string | null) {
  return {
    doNumber: report.doNumber,
    partnerName: report.partnerName,
    picName: report.partnerPicName ?? '',
    warehouseName: report.destinationWarehouseName,
    receivedDate: report.receivedDate,
    message: message ?? '',
    hasMissing: report.missingUnits.length > 0,
    missingCount: report.missingUnits.length,
    missingUnits: report.missingUnits.map(emailUnit),
    hasDamaged: report.damagedUnits.length > 0,
    damagedCount: report.damagedUnits.length,
    damagedUnits: report.damagedUnits.map(emailUnit),
    hasIncomplete: report.incompleteUnits.length > 0,
    incompleteCount: report.incompleteUnits.length,
    incompleteUnits: report.incompleteUnits.map((unit) => ({
      ...emailUnit(unit),
      missingAccessories:
        unit.missingAccessories.map((entry) => entry.itemName).join(', ') ||
        '—',
    })),
    hasUnlisted: report.unlistedUnits.length > 0,
    unlistedCount: report.unlistedUnits.length,
    unlistedUnits: report.unlistedUnits.map(emailUnit),
    hasVariances: report.peripheralVariances.length > 0,
    varianceCount: report.peripheralVariances.length,
    variances: report.peripheralVariances.map((line) => ({
      itemName: line.itemName,
      documentedQty: line.documentedQty,
      receivedQty: line.receivedQty ?? 0,
      unit: line.itemUnit.toLowerCase(),
      variance: line.variance > 0 ? `+${line.variance}` : `${line.variance}`,
    })),
  };
}

@Injectable()
export class InboundShipmentService {
  constructor(private readonly mailService: MailService) {}

  /**
   * One page of shipments with optional search/status/warehouse/partner
   * filters plus the filtered total; partner and warehouse display fields
   * and the manifest/inspection counters come joined (the query lives in
   * @repo/db).
   */
  list(options: ListInboundShipmentsOptions): Promise<InboundShipmentListPage> {
    return listInboundShipments(options);
  }

  /** One shipment with both manifests and every checklist. */
  async get(id: string): Promise<InboundShipmentDetailRow> {
    const shipment = await findInboundShipmentById(id);
    if (!shipment) throw new NotFoundException('Inbound shipment not found.');
    return shipment;
  }

  /**
   * Dropdown options for the recording wizard, all served under the
   * caller's inbound-shipments grant (the same decoupling the terminals
   * form uses): active partner accounts, active products, the live
   * warehouse tree flattened with depth, and active item categories.
   */
  partnerOptions(): Promise<PartnerOption[]> {
    return listPartnerOptions();
  }

  productOptions(): Promise<ProductOption[]> {
    return listProductOptions();
  }

  async warehouseOptions(): Promise<ShipmentWarehouseOption[]> {
    const roots = buildWarehouseTree(await listAllWarehouses());
    const options: ShipmentWarehouseOption[] = [];
    const walk = (node: WarehouseTreeNode, depth: number) => {
      options.push({
        id: node.id,
        name: node.name,
        code: node.code,
        type: node.type,
        depth,
      });
      for (const child of node.children) walk(child, depth + 1);
    };
    for (const root of roots) walk(root, 0);
    return options;
  }

  itemOptions(): Promise<ItemCategoryOption[]> {
    return listItemCategoryOptions();
  }

  /** DOs with an unresolved discrepancy, for the "follow-up of" select. */
  parentShipmentOptions(): Promise<ParentShipmentOption[]> {
    return listParentShipmentOptions();
  }

  /** Records a Delivery Order: header + both manifests in one transaction. */
  async create(
    dto: CreateInboundShipmentDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await createInboundShipment(dto);
    if (result.ok) return result.shipment;
    throw writeException(result.error);
  }

  /** Replaces the header and manifests while the paperwork stage is open. */
  async update(
    id: string,
    dto: UpdateInboundShipmentDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await updateInboundShipment(id, dto);
    if (result.ok) return result.shipment;
    if (result.error === 'not-found') {
      throw new NotFoundException('Inbound shipment not found.');
    }
    throw writeException(result.error);
  }

  /** Records one unit's inspection result; returns the refreshed shipment. */
  async updateEdcItem(
    id: string,
    itemId: string,
    dto: UpdateEdcItemDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await updateInboundShipmentEdcItem(id, itemId, dto);
    if (result.ok) return result.shipment;
    if (result.error === 'not-found') {
      throw new NotFoundException('Inspection item not found.');
    }
    throw writeException(result.error);
  }

  /** Adds a serial found physically but absent from the manifest. */
  async addEdcItem(
    id: string,
    dto: AddEdcItemDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await addUnlistedEdcItem(id, dto);
    if (result.ok) return result.shipment;
    if (result.error === 'not-found') {
      throw new NotFoundException('Inbound shipment not found.');
    }
    throw writeException(result.error);
  }

  /** Records the counted quantity (and note) of one peripheral line. */
  async updatePeripheralItem(
    id: string,
    itemId: string,
    dto: UpdatePeripheralItemDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await updateInboundShipmentPeripheralItem(id, itemId, dto);
    if (result.ok) return result.shipment;
    if (result.error === 'not-found') {
      throw new NotFoundException('Peripheral line not found.');
    }
    throw writeException(result.error);
  }

  /**
   * Closes the inspection: creates a terminal per unit that passed QC,
   * adds every counted peripheral quantity to warehouse stock and marks
   * the shipment completed — all inside one transaction in the db layer.
   */
  async finalize(
    id: string,
    changedByUserId: string | null,
  ): Promise<FinalizeInspectionResponse> {
    const result = await finalizeInboundShipment(id, changedByUserId);
    if (result.ok) {
      return { summary: result.summary, shipment: result.shipment };
    }
    switch (result.error) {
      case 'not-found':
        throw new NotFoundException('Inbound shipment not found.');
      case 'already-completed':
        throw new ConflictException(
          'This inspection has already been finalized.',
        );
      case 'inspection-incomplete':
        throw new BadRequestException(
          'Every unit needs a found/missing call and every peripheral line a counted quantity before the inspection can be finalized.',
        );
      case 'serial-registered':
        throw new ConflictException(
          `A terminal is already registered for ${(result.serials ?? []).join(', ')} — resolve the duplicate before finalizing.`,
        );
    }
  }

  /** Structured discrepancy data for the report modal. */
  async discrepancyReport(id: string): Promise<DiscrepancyReport> {
    const report = await buildDiscrepancyReport(id);
    if (!report) throw new NotFoundException('Inbound shipment not found.');
    return report;
  }

  /**
   * Emails the discrepancy report to the partner and records the REPORTED
   * step. The state is checked before anything is sent, so a doomed
   * request never emails the partner; the step is only recorded after the
   * email actually went out.
   */
  async sendDiscrepancyReport(
    id: string,
    actorUserId: string | null,
    dto: SendDiscrepancyReportDto,
  ): Promise<InboundShipmentDetailRow> {
    const report = await buildDiscrepancyReport(id);
    if (!report) throw new NotFoundException('Inbound shipment not found.');
    if (report.discrepancyStatus === null) {
      throw discrepancyException('not-finalized');
    }
    if (report.discrepancyStatus === 'NONE') {
      throw discrepancyException('no-discrepancies');
    }
    if (report.discrepancyStatus === 'RESOLVED') {
      throw discrepancyException('already-resolved');
    }

    const recipient = dto.recipientEmail ?? report.partnerEmail;
    if (!recipient) {
      throw new BadRequestException(
        'The partner account has no PIC email on file — provide recipientEmail.',
      );
    }

    try {
      await this.mailService.send({
        to: recipient,
        subject: `Laporan Perbedaan Penerimaan · Surat Jalan ${report.doNumber}`,
        template: 'discrepancy-report',
        context: reportEmailContext(report, dto.message),
      });
    } catch {
      throw new BadGatewayException(
        'The discrepancy report email could not be sent — check the mail configuration and try again.',
      );
    }

    const result = await markDiscrepancyReported(id, {
      actorUserId,
      recipientEmail: recipient,
      notes: dto.message,
    });
    if (result.ok) return result.shipment;
    throw discrepancyException(result.error);
  }

  /** Records the partner's answer to the discrepancy report. */
  async confirmDiscrepancy(
    id: string,
    actorUserId: string | null,
    dto: ConfirmDiscrepancyDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await confirmDiscrepancy(id, {
      actorUserId,
      partnerResponse: dto.partnerResponse,
      notes: dto.notes,
    });
    if (result.ok) return result.shipment;
    throw discrepancyException(result.error);
  }

  /** Closes the discrepancy case by hand. */
  async resolveDiscrepancy(
    id: string,
    actorUserId: string | null,
    dto: ResolveDiscrepancyDto,
  ): Promise<InboundShipmentDetailRow> {
    const result = await resolveDiscrepancy(id, {
      actorUserId,
      notes: dto.notes,
    });
    if (result.ok) return result.shipment;
    throw discrepancyException(result.error);
  }
}
