import { describe, it, expect } from 'vitest';
import { normalizeFilePath } from '@/server/modules/scan/parsers/path-normalizer';

describe('normalizeFilePath', () => {
  it('should strip temp dir prefix (Unix)', () => {
    expect(normalizeFilePath('/tmp/sast-managed-kcpUhh/repo/main.c')).toBe('main.c');
  });

  it('should strip temp dir prefix (Windows)', () => {
    expect(normalizeFilePath('C:\\Users\\Rezork\\AppData\\Local\\Temp\\sast-managed-kcpUhh\\repo\\main.c')).toBe('main.c');
  });

  it('should strip temp dir prefix with subdirectory', () => {
    expect(normalizeFilePath('/tmp/sast-managed-kcpUhh/repo/src/app.py')).toBe('src/app.py');
  });

  it('should strip ./', () => {
    expect(normalizeFilePath('./src/app.py')).toBe('src/app.py');
  });

  it('should normalize backslashes', () => {
    expect(normalizeFilePath('src\\app\\main.c')).toBe('src/app/main.c');
  });

  it('should handle already relative path', () => {
    expect(normalizeFilePath('main.c')).toBe('main.c');
  });

  it('should handle empty string', () => {
    expect(normalizeFilePath('')).toBe('');
  });

  it('should handle Windows path with repo', () => {
    expect(normalizeFilePath('C:\\Users\\Rezork\\AppData\\Local\\Temp\\opencode\\ci-scan\\repo\\main.c')).toBe('main.c');
  });

  it('should handle Unix path with repo subdirectory', () => {
    expect(normalizeFilePath('/tmp/sast-managed-XXXX/repo/src/utils/helper.c')).toBe('src/utils/helper.c');
  });
});
