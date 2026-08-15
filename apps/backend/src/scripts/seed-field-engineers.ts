import 'dotenv/config';
import { auth } from '@repo/auth';
import { APIError } from 'better-auth/api';
import type { UserWithRole } from 'better-auth/plugins';
import {
  createFieldEngineerProfile,
  db,
  schema,
  updateFieldEngineerProfile,
} from '@repo/db';
import { eq } from 'drizzle-orm';
import { FIELD_ENGINEER_ROLE } from '@repo/db/schema';
import type {
  FieldEngineerSpecialization,
  FieldEngineerStatus,
} from '@repo/db/schema';

/**
 * Seeds demo Field Engineers: 8 users holding the Field_Service_Engineer
 * role, 6 of them with a completed work profile (varied warehouses,
 * regions and specializations) and 2 left without one — so the
 * "available-users" / "Needs Setup" flow is actually testable.
 *
 * Users are created through `auth.api.createUser` (bypasses the admin
 * guard when called server-side, hashes with the configured Argon2id
 * hasher, links the credential account row). Re-running is idempotent:
 * existing users get the role ensured and profiles are updated in place.
 *
 * Usage: pnpm --filter backend seed:field-engineers
 * (chains seed-warehouses first so the profile warehouses exist)
 */

const PASSWORD = 'Engineer12345!';

interface EngineerSeed {
  email: string;
  name: string;
  profile: {
    warehouseCode: string;
    coverageRegion: string;
    specializations: FieldEngineerSpecialization[];
    status: FieldEngineerStatus;
  } | null;
}

const ENGINEERS: EngineerSeed[] = [
  {
    email: 'andi.pratama@example.com',
    name: 'Andi Pratama',
    profile: {
      warehouseCode: 'WH-SP-BDG',
      coverageRegion: 'Bandung Kota',
      specializations: ['INSTALLATION', 'TROUBLESHOOTING'],
      status: 'ACTIVE',
    },
  },
  {
    email: 'budi.santoso@example.com',
    name: 'Budi Santoso',
    profile: {
      warehouseCode: 'WH-SP-BKS',
      coverageRegion: 'Bekasi & Cikarang',
      specializations: ['INSTALLATION', 'REPLACEMENT'],
      status: 'ACTIVE',
    },
  },
  {
    email: 'citra.lestari@example.com',
    name: 'Citra Lestari',
    profile: {
      warehouseCode: 'WH-REG-JATIM',
      coverageRegion: 'Jawa Timur',
      specializations: ['PREVENTIVE_MAINTENANCE'],
      status: 'ON_LEAVE',
    },
  },
  {
    email: 'dedi.kurniawan@example.com',
    name: 'Dedi Kurniawan',
    profile: {
      warehouseCode: 'WH-SP-SBY',
      coverageRegion: 'Surabaya Timur',
      specializations: ['INSTALLATION', 'REPLACEMENT', 'TROUBLESHOOTING'],
      status: 'ACTIVE',
    },
  },
  {
    email: 'eka.wijaya@example.com',
    name: 'Eka Wijaya',
    profile: {
      warehouseCode: 'WH-REG-JABAR',
      coverageRegion: 'Jawa Barat',
      specializations: ['PREVENTIVE_MAINTENANCE', 'TROUBLESHOOTING'],
      status: 'ACTIVE',
    },
  },
  {
    email: 'fajar.hidayat@example.com',
    name: 'Fajar Hidayat',
    profile: {
      warehouseCode: 'WH-CTR-JKT',
      coverageRegion: 'DKI Jakarta',
      specializations: [
        'INSTALLATION',
        'REPLACEMENT',
        'PREVENTIVE_MAINTENANCE',
        'TROUBLESHOOTING',
      ],
      status: 'INACTIVE',
    },
  },
  // Role holders WITHOUT a profile — exercise "Needs Setup"/available-users.
  { email: 'gita.maharani@example.com', name: 'Gita Maharani', profile: null },
  { email: 'hendra.gunawan@example.com', name: 'Hendra Gunawan', profile: null },
];

/** Ensures the user exists with the Field Engineer role; returns its id. */
async function ensureEngineerUser(seed: EngineerSeed): Promise<string> {
  try {
    const { user } = await auth.api.createUser({
      body: {
        email: seed.email,
        password: PASSWORD,
        name: seed.name,
        role: 'Field_Service_Engineer',
        // Out-of-band seed — trust its email like seed-admin does.
        data: { emailVerified: true },
      },
    });
    console.log(`Created ${seed.email} (id: ${user.id})`);
    return user.id;
  } catch (error) {
    if (!(error instanceof APIError) || error.status !== 'BAD_REQUEST') {
      throw error;
    }
    const ctx = await auth.$context;
    const existing = await ctx.internalAdapter.findUserByEmail(seed.email);
    if (!existing) throw error;
    // Ensure the role is present (comma-separated multi-role aware).
    const currentRole = (existing.user as UserWithRole).role ?? '';
    const keys = currentRole
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
    if (!keys.includes(FIELD_ENGINEER_ROLE)) {
      await ctx.internalAdapter.updateUser(existing.user.id, {
        role: [...keys, FIELD_ENGINEER_ROLE].join(','),
      });
      console.log(`Added ${FIELD_ENGINEER_ROLE} role to ${seed.email}`);
    }
    return existing.user.id;
  }
}

async function main() {
  for (const seed of ENGINEERS) {
    const userId = await ensureEngineerUser(seed);

    if (!seed.profile) continue;

    const [warehouse] = await db
      .select({ id: schema.warehouses.id })
      .from(schema.warehouses)
      .where(eq(schema.warehouses.code, seed.profile.warehouseCode));
    if (!warehouse) {
      console.error(
        `Warehouse ${seed.profile.warehouseCode} not found — run seed:warehouses first.`,
      );
      process.exit(1);
    }

    const input = {
      warehouseId: warehouse.id,
      coverageRegion: seed.profile.coverageRegion,
      specializations: [...seed.profile.specializations],
      status: seed.profile.status,
    };
    const created = await createFieldEngineerProfile(userId, input);
    if (created.ok) {
      console.log(`Created profile for ${seed.email}`);
    } else if (created.error === 'profile-exists') {
      const updated = await updateFieldEngineerProfile(userId, input);
      if (!updated.ok) {
        console.error(`Failed to update ${seed.email}: ${updated.error}`);
        process.exit(1);
      }
      console.log(`Updated profile for ${seed.email}`);
    } else {
      console.error(`Failed to seed ${seed.email}: ${created.error}`);
      process.exit(1);
    }
  }
  console.log(`Seeded ${ENGINEERS.length} field engineer users.`);
  process.exit(0);
}

void main();
