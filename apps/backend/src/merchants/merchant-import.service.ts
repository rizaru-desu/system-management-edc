import { ConflictException, Injectable } from '@nestjs/common';
import {
  findExistingMerchantCodes,
  insertMerchants,
  listAllServicePoints,
} from '@repo/db';
import type { MerchantInput } from '@repo/db';
import type { MerchantStatus } from '@repo/db/schema';
import { isValidEmail, isValidPhoneNumber } from './dto/create-merchant.dto';
import type { ImportMerchantRowDto } from './dto/import-merchants.dto';
import { findNearestServicePoint } from './utils/nearest-service-point.util';
import type {
  AssignmentStatus,
  ServicePointCandidate,
} from './utils/nearest-service-point.util';

/** One processed row of the import preview/commit. */
export interface MerchantImportRowReport {
  /** Spreadsheet row number (header = row 1, first data row = 2). */
  rowNumber: number;
  merchantCode: string | null;
  merchantName: string | null;
  picName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: MerchantStatus;
  nearestServicePointName: string | null;
  /** Distance (km, 2dp) to the nearest active service point. */
  distanceKm: number | null;
  /** null while the row is invalid — assignment never ran. */
  assignmentStatus: AssignmentStatus | null;
  errors: string[];
}

export interface MerchantImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  /** Valid rows automatically assigned to a service point. */
  assigned: number;
  /** Valid rows with no assignment (outside coverage / no active SP). */
  needManualAssignment: number;
}

export interface MerchantImportPreview {
  rows: MerchantImportRowReport[];
  summary: MerchantImportSummary;
}

export interface MerchantImportResult {
  /** Rows saved (valid + automatically assigned). */
  imported: number;
  invalidRows: number;
  /** Valid rows skipped because they need manual assignment. */
  needManualAssignment: number;
}

/** Raw cell → trimmed string; empty/absent → null. */
function cellToText(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

type CoordinateCheck =
  { ok: true; value: number } | { ok: false; error: string };

/**
 * Parses one coordinate cell: required, numeric (integer or decimal,
 * whitespace-trimmed) and within `±bound`.
 */
function parseCoordinate(
  raw: string | number | null | undefined,
  bound: number,
  label: 'Latitude' | 'Longitude',
): CoordinateCheck {
  const text = cellToText(raw);
  if (text === null) return { ok: false, error: `${label} is required.` };
  const value = Number(text);
  if (Number.isNaN(value)) {
    return { ok: false, error: `Invalid ${label} format.` };
  }
  if (value < -bound || value > bound) {
    return {
      ok: false,
      error: `${label} must be between -${bound} and ${bound}.`,
    };
  }
  return { ok: true, value };
}

/** Normalized row fields, ready to become a MerchantInput once assigned. */
interface NormalizedRow {
  merchantCode: string | null;
  merchantName: string | null;
  merchantType: string | null;
  picName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  status: MerchantStatus;
  errors: string[];
}

/** Validates and normalizes one raw Excel row (coordinates, formats). */
function normalizeRow(row: ImportMerchantRowDto): NormalizedRow {
  const errors: string[] = [];

  const merchantCode = cellToText(row.merchantCode);
  if (!merchantCode) errors.push('Merchant Code is required.');

  const merchantName = cellToText(row.merchantName);
  if (!merchantName) errors.push('Merchant Name is required.');

  const phoneNumber = cellToText(row.phoneNumber);
  if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
    errors.push('Invalid Phone Number format.');
  }

  const email = cellToText(row.email)?.toLowerCase() ?? null;
  if (email && !isValidEmail(email)) {
    errors.push('Invalid Email format.');
  }

  const postalCode = cellToText(row.postalCode);
  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    errors.push('Postal Code must be 5 digits.');
  }

  const latitudeCheck = parseCoordinate(row.latitude, 90, 'Latitude');
  if (!latitudeCheck.ok) errors.push(latitudeCheck.error);

  const longitudeCheck = parseCoordinate(row.longitude, 180, 'Longitude');
  if (!longitudeCheck.ok) errors.push(longitudeCheck.error);

  const statusText = cellToText(row.status)?.toUpperCase() ?? 'ACTIVE';
  let status: MerchantStatus = 'ACTIVE';
  if (statusText === 'ACTIVE' || statusText === 'INACTIVE') {
    status = statusText;
  } else {
    errors.push('Status must be ACTIVE or INACTIVE.');
  }

  return {
    merchantCode,
    merchantName,
    merchantType: cellToText(row.merchantType),
    picName: cellToText(row.picName),
    phoneNumber,
    email,
    address: cellToText(row.address),
    province: cellToText(row.province),
    city: cellToText(row.city),
    district: cellToText(row.district),
    postalCode,
    latitude: latitudeCheck.ok ? latitudeCheck.value : null,
    longitude: longitudeCheck.ok ? longitudeCheck.value : null,
    status,
    errors,
  };
}

/** A processed row plus everything the commit step needs to insert it. */
interface ProcessedRow {
  report: MerchantImportRowReport;
  /** Set only for valid rows that were automatically assigned. */
  input: MerchantInput | null;
}

@Injectable()
export class MerchantImportService {
  /**
   * Shared pipeline of the preview and commit endpoints: normalize and
   * validate every row (required fields, coordinate/format checks,
   * duplicates within the file and against the database — one bulk query),
   * then run the nearest-service-point assignment over the active service
   * point list, loaded once for the whole batch.
   */
  private async process(rows: ImportMerchantRowDto[]): Promise<ProcessedRow[]> {
    const normalized = rows.map(normalizeRow);

    // Duplicate merchant codes within the uploaded file.
    const codeCounts = new Map<string, number>();
    for (const row of normalized) {
      if (row.merchantCode) {
        codeCounts.set(
          row.merchantCode,
          (codeCounts.get(row.merchantCode) ?? 0) + 1,
        );
      }
    }

    // Codes already used by live merchants — one query for the whole batch.
    const existingCodes = new Set(
      await findExistingMerchantCodes([...codeCounts.keys()]),
    );

    // Active service points with coordinates, loaded once for every row.
    const candidates: ServicePointCandidate[] = (await listAllServicePoints())
      .filter(
        (servicePoint) =>
          servicePoint.status === 'ACTIVE' &&
          servicePoint.latitude !== null &&
          servicePoint.longitude !== null,
      )
      .map((servicePoint) => ({
        id: servicePoint.id,
        name: servicePoint.name,
        latitude: servicePoint.latitude!,
        longitude: servicePoint.longitude!,
        coverageRadiusKm: servicePoint.coverageRadiusKm,
      }));

    return normalized.map((row, index) => {
      const errors = [...row.errors];
      if (row.merchantCode) {
        if ((codeCounts.get(row.merchantCode) ?? 0) > 1) {
          errors.push('Duplicate Merchant Code within the uploaded file.');
        }
        if (existingCodes.has(row.merchantCode)) {
          errors.push('Merchant Code already exists.');
        }
      }

      const valid = errors.length === 0;
      const assignment =
        valid && row.latitude !== null && row.longitude !== null
          ? findNearestServicePoint(row.latitude, row.longitude, candidates)
          : null;

      const report: MerchantImportRowReport = {
        // Header occupies spreadsheet row 1, so data starts at row 2.
        rowNumber: index + 2,
        merchantCode: row.merchantCode,
        merchantName: row.merchantName,
        picName: row.picName,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status,
        nearestServicePointName: assignment?.nearestServicePointName ?? null,
        distanceKm: assignment?.distanceKm ?? null,
        assignmentStatus: assignment?.assignmentStatus ?? null,
        errors,
      };

      const input: MerchantInput | null =
        assignment?.servicePointId != null
          ? {
              merchantCode: row.merchantCode!,
              merchantName: row.merchantName!,
              merchantType: row.merchantType,
              picName: row.picName,
              phoneNumber: row.phoneNumber,
              email: row.email,
              address: row.address,
              province: row.province,
              city: row.city,
              district: row.district,
              postalCode: row.postalCode,
              latitude: row.latitude,
              longitude: row.longitude,
              distanceToServicePointKm: assignment.distanceKm,
              servicePointId: assignment.servicePointId,
              status: row.status,
            }
          : null;

      return { report, input };
    });
  }

  private summarize(processed: ProcessedRow[]): MerchantImportSummary {
    const validRows = processed.filter(
      ({ report }) => report.errors.length === 0,
    );
    const assigned = validRows.filter(
      ({ report }) => report.assignmentStatus === 'ASSIGNED',
    ).length;
    return {
      totalRows: processed.length,
      validRows: validRows.length,
      invalidRows: processed.length - validRows.length,
      assigned,
      needManualAssignment: validRows.length - assigned,
    };
  }

  /** Validation + assignment preview — nothing is written. */
  async preview(rows: ImportMerchantRowDto[]): Promise<MerchantImportPreview> {
    const processed = await this.process(rows);
    return {
      rows: processed.map(({ report }) => report),
      summary: this.summarize(processed),
    };
  }

  /**
   * Commits the import: re-runs the full pipeline server-side (the preview
   * result is never trusted), then bulk-inserts the valid, automatically
   * assigned rows in one transaction. Invalid and unassigned rows are
   * skipped and reported back.
   */
  async import(rows: ImportMerchantRowDto[]): Promise<MerchantImportResult> {
    const processed = await this.process(rows);
    const summary = this.summarize(processed);
    const inputs = processed
      .map(({ input }) => input)
      .filter((input): input is MerchantInput => input !== null);

    const result = await insertMerchants(inputs);
    if (!result.ok) {
      // A concurrent create claimed one of the codes between the check and
      // the insert — surface it like the single-create conflict.
      throw new ConflictException(
        `Merchant codes already in use: ${result.codes.join(', ')}.`,
      );
    }

    return {
      imported: result.inserted,
      invalidRows: summary.invalidRows,
      needManualAssignment: summary.needManualAssignment,
    };
  }
}
