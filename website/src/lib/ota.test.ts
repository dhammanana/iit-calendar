import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSemVer, isNewer, compareSemVer } from './ota';

describe('OTA Version Utility Tests', () => {
  describe('parseSemVer', () => {
    it('should parse standard semver version strings', () => {
      const res = parseSemVer('1.0.0');
      assert.deepEqual(res, { major: 1, minor: 0, patch: 0, clean: '1.0.0' });
    });

    it('should strip leading "v" from version strings', () => {
      const res = parseSemVer('v1.1.7');
      assert.deepEqual(res, { major: 1, minor: 1, patch: 7, clean: '1.1.7' });
    });

    it('should correctly parse prerelease version strings', () => {
      const res0 = parseSemVer('1.1.7-dev.0');
      assert.deepEqual(res0, { major: 1, minor: 1, patch: 7, clean: '1.1.7-dev.0' });

      const res1 = parseSemVer('v1.1.7-dev.1');
      assert.deepEqual(res1, { major: 1, minor: 1, patch: 7, clean: '1.1.7-dev.1' });
    });

    it('should handle non-semver fallback strings like "builtin"', () => {
      const res = parseSemVer('builtin');
      assert.deepEqual(res, { major: 0, minor: 0, patch: 0, clean: 'builtin' });
    });
  });

  describe('isNewer', () => {
    it('should return true for higher patch versions', () => {
      assert.equal(isNewer('1.0.1', '1.0.0'), true);
      assert.equal(isNewer('1.0.0', '1.0.1'), false);
      assert.equal(isNewer('1.0.0', '1.0.0'), false);
    });

    it('should return true for higher minor and major versions', () => {
      assert.equal(isNewer('1.2.0', '1.1.9'), true);
      assert.equal(isNewer('2.0.0', '1.9.9'), true);
    });

    it('should correctly compare dev / prerelease versions (1.1.7-dev.1 vs 1.1.7-dev.0)', () => {
      assert.equal(isNewer('1.1.7-dev.1', '1.1.7-dev.0'), true);
      assert.equal(isNewer('1.1.7-dev.0', '1.1.7-dev.1'), false);
      assert.equal(isNewer('1.1.7-dev.2', '1.1.7-dev.1'), true);
    });

    it('should correctly rank release versions above prerelease versions of the same target', () => {
      assert.equal(isNewer('1.1.7', '1.1.7-dev.1'), true);
      assert.equal(isNewer('1.1.7-dev.1', '1.1.7'), false);
    });

    it('should correctly rank next patch prerelease above previous release', () => {
      assert.equal(isNewer('1.1.8-dev.0', '1.1.7'), true);
      assert.equal(isNewer('1.1.7', '1.1.8-dev.0'), false);
    });
  });

  describe('compareSemVer', () => {
    it('should return positive number when first argument is greater', () => {
      assert.ok(compareSemVer('1.1.7-dev.1', '1.1.7-dev.0') > 0);
    });

    it('should return negative number when first argument is smaller', () => {
      assert.ok(compareSemVer('1.1.7-dev.0', '1.1.7-dev.1') < 0);
    });

    it('should return 0 when versions are equal', () => {
      assert.equal(compareSemVer('1.1.7-dev.0', '1.1.7-dev.0'), 0);
    });

    it('should correctly sort an array of releases descending (newest first)', () => {
      const versions = ['1.1.7-dev.0', '1.1.7-dev.2', '1.1.7-dev.1', '1.1.7'];
      versions.sort((a, b) => compareSemVer(b, a));
      assert.deepEqual(versions, ['1.1.7', '1.1.7-dev.2', '1.1.7-dev.1', '1.1.7-dev.0']);
    });
  });
});
