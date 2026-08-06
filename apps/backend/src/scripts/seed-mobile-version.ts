import 'dotenv/config';
import { createMobileVersion } from '@repo/db';

/**
 * Seeds initial active Android mobile version into the database.
 * Usage: pnpm --filter backend seed:mobile-version
 */
async function main() {
  console.log('Seeding active Android version record...');

  try {
    const result = await createMobileVersion({
      platform: 'android',
      latestVersion: '1.0.1',
      minimumVersion: '1.0.0',
      forceUpdate: false,
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.edc.app',
      updateUrl: 'https://play.google.com/store/apps/details?id=com.edc.app',
      releaseNotes: 'Initial release of EDC System Management mobile app.',
      checksum: '',
      fileSize: 0,
      publishedAt: new Date(),
      isActive: true,
    });

    if (!result.ok) {
      console.log('Android version already seeded — nothing to do.');
      process.exit(0);
    }

    console.log(
      `Successfully seeded active Android version: ${result.release.latestVersion} (id: ${result.release.id})`,
    );
  } catch (error) {
    console.error('Error seeding mobile version:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
