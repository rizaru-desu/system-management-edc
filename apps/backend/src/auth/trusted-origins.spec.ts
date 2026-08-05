import {
  parseOrigins,
  getOriginFromUrl,
  resolveTrustedOrigins,
  isOriginAllowed,
  getCorsOriginDelegate,
  DEFAULT_DEV_PORTS,
  DEV_WILDCARD_ORIGINS,
  ANDROID_EMULATOR_HOST,
} from './trusted-origins';

describe('Trusted Origins Utility', () => {
  describe('parseOrigins', () => {
    it('should parse comma-separated string into trimmed, non-empty, deduplicated array', () => {
      const raw =
        ' http://localhost:5173 , http://192.168.1.10:5173, , exp://192.168.1.10:8081/, http://localhost:5173 ';
      const parsed = parseOrigins(raw);

      expect(parsed).toEqual([
        'http://localhost:5173',
        'http://192.168.1.10:5173',
        'exp://192.168.1.10:8081',
      ]);
    });

    it('should handle null or undefined gracefully', () => {
      expect(parseOrigins(null)).toEqual([]);
      expect(parseOrigins(undefined)).toEqual([]);
      expect(parseOrigins('')).toEqual([]);
    });

    it('should accept an existing array of strings and clean it', () => {
      const rawArray = [
        ' http://localhost:3000/ ',
        '',
        'http://localhost:3000',
      ];
      expect(parseOrigins(rawArray)).toEqual(['http://localhost:3000']);
    });
  });

  describe('getOriginFromUrl', () => {
    it('should extract origin from full URL string', () => {
      expect(getOriginFromUrl('http://localhost:5173/login?redirect=1')).toBe(
        'http://localhost:5173',
      );
      expect(getOriginFromUrl('https://app.example.com:8443/api/v1')).toBe(
        'https://app.example.com:8443',
      );
    });

    it('should return null for empty or invalid values', () => {
      expect(getOriginFromUrl(null)).toBeNull();
      expect(getOriginFromUrl('')).toBeNull();
    });
  });

  describe('resolveTrustedOrigins in Production', () => {
    it('should only use origins defined in .env and not auto-detect LAN IPs in production', () => {
      const origins = resolveTrustedOrigins({
        nodeEnv: 'production',
        envOrigins:
          'http://localhost:5173,http://192.168.1.10:5173,exp://192.168.1.10:8081',
        webAppUrl: 'https://admin.example.com',
        betterAuthUrl: 'https://api.example.com',
      });

      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://192.168.1.10:5173');
      expect(origins).toContain('exp://192.168.1.10:8081');
      expect(origins).toContain('https://admin.example.com');
      expect(origins).toContain('https://api.example.com');

      // In production, wildcards and auto-detected dev ports must not be included
      expect(origins).not.toContain('http://localhost:*');
      expect(origins).not.toContain('http://127.0.0.1:*');
      expect(origins).not.toContain(`http://${ANDROID_EMULATOR_HOST}:3000`);
    });
  });

  describe('resolveTrustedOrigins in Development', () => {
    it('should include .env origins, dev wildcards, localhost ports, Android emulator, and detected LAN IPs', () => {
      const origins = resolveTrustedOrigins({
        nodeEnv: 'development',
        envOrigins:
          'http://localhost:5173,http://192.168.1.10:5173,exp://192.168.1.10:8081',
        webAppUrl: 'http://localhost:5173',
        betterAuthUrl: 'http://localhost:3001',
      });

      // Contains env-defined origins
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://192.168.1.10:5173');
      expect(origins).toContain('exp://192.168.1.10:8081');
      expect(origins).toContain('http://localhost:3001');

      // Contains dev wildcards
      for (const wildcard of DEV_WILDCARD_ORIGINS) {
        expect(origins).toContain(wildcard);
      }

      // Contains localhost and 127.0.0.1 dev ports (3000, 3001, 5173, 8081)
      for (const port of DEFAULT_DEV_PORTS) {
        expect(origins).toContain(`http://localhost:${port}`);
        expect(origins).toContain(`http://127.0.0.1:${port}`);
        expect(origins).toContain(`http://${ANDROID_EMULATOR_HOST}:${port}`);
      }
      expect(origins).toContain('exp://localhost:8081');
      expect(origins).toContain('exp://127.0.0.1:8081');
      expect(origins).toContain(`exp://${ANDROID_EMULATOR_HOST}:8081`);
    });
  });

  describe('isOriginAllowed', () => {
    const trustedList = [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'exp://localhost:*',
      'http://192.168.1.100:5173',
      'exp://192.168.1.100:8081',
      'https://*.example.com',
    ];

    it('should allow requests with no Origin header (native mobile, curl, server-to-server)', () => {
      expect(isOriginAllowed(undefined, trustedList)).toBe(true);
      expect(isOriginAllowed(null, trustedList)).toBe(true);
      expect(isOriginAllowed('', trustedList)).toBe(true);
    });

    it('should match exact trusted origins', () => {
      expect(isOriginAllowed('http://192.168.1.100:5173', trustedList)).toBe(
        true,
      );
      expect(isOriginAllowed('exp://192.168.1.100:8081', trustedList)).toBe(
        true,
      );
    });

    it('should match wildcard port origins (e.g. http://localhost:*)', () => {
      expect(isOriginAllowed('http://localhost:3000', trustedList)).toBe(true);
      expect(isOriginAllowed('http://localhost:5173', trustedList)).toBe(true);
      expect(isOriginAllowed('http://localhost:8081', trustedList)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3001', trustedList)).toBe(true);
      expect(isOriginAllowed('exp://localhost:8081', trustedList)).toBe(true);
    });

    it('should match wildcard subdomain origins (e.g. https://*.example.com)', () => {
      expect(isOriginAllowed('https://app.example.com', trustedList)).toBe(
        true,
      );
      expect(isOriginAllowed('https://admin.example.com', trustedList)).toBe(
        true,
      );
    });

    it('should reject untrusted origins', () => {
      expect(isOriginAllowed('http://evil.com', trustedList)).toBe(false);
      expect(isOriginAllowed('http://192.168.1.200:5173', trustedList)).toBe(
        false,
      );
      expect(
        isOriginAllowed('https://malicious-example.com', trustedList),
      ).toBe(false);
    });
  });

  describe('getCorsOriginDelegate', () => {
    it('should invoke callback with true for allowed origins and error for rejected origins', () => {
      const delegate = getCorsOriginDelegate([
        'http://localhost:5173',
        'http://localhost:*',
      ]);

      let allowedResult: boolean | undefined;
      let allowedError: Error | null = null;
      delegate('http://localhost:5173', (err, allow) => {
        allowedError = err;
        allowedResult = allow;
      });
      expect(allowedError).toBeNull();
      expect(allowedResult).toBe(true);

      let disallowedResult: boolean | undefined;
      let disallowedError: Error | null = null;
      delegate('http://untrusted-domain.com', (err, allow) => {
        disallowedError = err;
        disallowedResult = allow;
      });
      expect(disallowedError).toBeInstanceOf(Error);
      expect(disallowedResult).toBeUndefined();
    });
  });
});
