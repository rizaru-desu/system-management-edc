import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createServicePoint,
  findServicePointById,
  listAllServicePoints,
  listServicePoints,
  softDeleteServicePoint,
  updateServicePoint,
} from '@repo/db';
import type {
  ListServicePointsOptions,
  ServicePointListPage,
  ServicePointRow,
} from '@repo/db';
import type { CreateServicePointDto } from './dto/create-service-point.dto';
import type { UpdateServicePointDto } from './dto/update-service-point.dto';
import { buildServicePointTree } from './utils/tree-builder.util';
import type { ServicePointTreeNode } from './utils/tree-builder.util';

@Injectable()
export class ServicePointService {
  /**
   * One page of service points with optional search/status/parent filters
   * plus the filtered total (the query itself lives in @repo/db).
   */
  list(options: ListServicePointsOptions): Promise<ServicePointListPage> {
    return listServicePoints(options);
  }

  /** The full live hierarchy as recursive nodes (unlimited nesting). */
  async tree(): Promise<ServicePointTreeNode[]> {
    return buildServicePointTree(await listAllServicePoints());
  }

  async get(id: string): Promise<ServicePointRow> {
    const servicePoint = await findServicePointById(id);
    if (!servicePoint) throw new NotFoundException('Service point not found.');
    return servicePoint;
  }

  async create(dto: CreateServicePointDto): Promise<ServicePointRow> {
    const result = await createServicePoint(dto);
    if (result.ok) return result.servicePoint;

    if (result.error === 'code-taken') {
      throw new ConflictException('Service point code is already in use.');
    }
    throw new BadRequestException('Parent service point not found.');
  }

  async update(
    id: string,
    dto: UpdateServicePointDto,
  ): Promise<ServicePointRow> {
    const result = await updateServicePoint(id, dto);
    if (result.ok) return result.servicePoint;

    switch (result.error) {
      case 'code-taken':
        throw new ConflictException('Service point code is already in use.');
      case 'parent-not-found':
        throw new BadRequestException('Parent service point not found.');
      case 'parent-self':
        throw new BadRequestException(
          'A service point cannot be its own parent.',
        );
      case 'parent-cycle':
        throw new BadRequestException(
          'This parent would create a circular hierarchy.',
        );
      default:
        throw new NotFoundException('Service point not found.');
    }
  }

  /** Soft delete; refused while the service point still has live children. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteServicePoint(id);
    if (result.ok) return { id };

    if (result.error === 'has-children') {
      throw new ConflictException(
        'Cannot delete a service point that still has child service points.',
      );
    }
    throw new NotFoundException('Service point not found.');
  }
}
