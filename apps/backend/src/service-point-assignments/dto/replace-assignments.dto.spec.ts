import { BadRequestException } from '@nestjs/common';
import { parseReplaceAssignmentsDto } from './replace-assignments.dto';

describe('parseReplaceAssignmentsDto', () => {
  it('accepts a valid multi-assignment payload', () => {
    const dto = parseReplaceAssignmentsDto({
      assignments: [
        {
          servicePointId: 'sp-1',
          roleAtServicePoint: 'LEADER',
          isDefault: true,
        },
        {
          servicePointId: 'sp-2',
          roleAtServicePoint: 'ENGINEER',
          isDefault: false,
        },
      ],
    });
    expect(dto.assignments).toHaveLength(2);
    expect(dto.assignments[0].isDefault).toBe(true);
    expect(dto.assignments[1].isDefault).toBe(false);
  });

  it('auto-defaults a single assignment', () => {
    const dto = parseReplaceAssignmentsDto({
      assignments: [{ servicePointId: 'sp-1', roleAtServicePoint: 'ENGINEER' }],
    });
    expect(dto.assignments[0].isDefault).toBe(true);
  });

  it('allows an empty set (unassign everything)', () => {
    expect(parseReplaceAssignmentsDto({ assignments: [] })).toEqual({
      assignments: [],
    });
  });

  it('rejects duplicate service points', () => {
    expect(() =>
      parseReplaceAssignmentsDto({
        assignments: [
          {
            servicePointId: 'sp-1',
            roleAtServicePoint: 'LEADER',
            isDefault: true,
          },
          { servicePointId: 'sp-1', roleAtServicePoint: 'ENGINEER' },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects zero or multiple defaults among 2+ assignments', () => {
    expect(() =>
      parseReplaceAssignmentsDto({
        assignments: [
          { servicePointId: 'sp-1', roleAtServicePoint: 'LEADER' },
          { servicePointId: 'sp-2', roleAtServicePoint: 'ENGINEER' },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseReplaceAssignmentsDto({
        assignments: [
          {
            servicePointId: 'sp-1',
            roleAtServicePoint: 'LEADER',
            isDefault: true,
          },
          {
            servicePointId: 'sp-2',
            roleAtServicePoint: 'ENGINEER',
            isDefault: true,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects roles outside the service point catalogue', () => {
    expect(() =>
      parseReplaceAssignmentsDto({
        assignments: [
          {
            servicePointId: 'sp-1',
            roleAtServicePoint: 'CEO',
            isDefault: true,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
