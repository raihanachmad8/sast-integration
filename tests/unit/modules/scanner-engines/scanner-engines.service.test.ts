import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  list: vi.fn(),
  getById: vi.fn(),
};

vi.mock('@/server/modules/scanner-engines/scanner-engines.repository', () => ({
  scannerEnginesRepository: mockRepo,
}));

const { scannerEnginesService } = await import('@/server/modules/scanner-engines/scanner-engines.service');

describe('scannerEnginesService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all scanner engines are returned from the service
   */
  it('+ should return all scanner engines', async () => {
    mockRepo.list.mockResolvedValue([{ id: 'semgrep', name: 'Semgrep' }, { id: 'bandit', name: 'Bandit' }]);
    const result = await scannerEnginesService.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Semgrep');
  });

  /**
   * Purpose: Validates that engine data includes command, format, and availability
   */
  it('+ should return engines with all fields', async () => {
    mockRepo.list.mockResolvedValue([{ id: 'semgrep', name: 'Semgrep', command: 'semgrep scan', format: 'json', isAvailable: true, status: 'ready' }]);
    const result = await scannerEnginesService.list();
    expect(result[0]).toHaveProperty('command');
    expect(result[0]).toHaveProperty('format');
    expect(result[0]).toHaveProperty('isAvailable');
  });

  /**
   * Purpose: Validates that an empty array is returned when no engines are configured
   */
  it('- should return empty array when no engines exist', async () => {
    mockRepo.list.mockResolvedValue([]);
    const result = await scannerEnginesService.list();
    expect(result).toEqual([]);
  });

  /**
   * Purpose: Validates that engine status values are preserved
   */
  it('+ should return engines with correct status values', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'semgrep', status: 'ready' },
      { id: 'bandit', status: 'not_installed' },
    ]);
    const result = await scannerEnginesService.list();
    expect(result[0].status).toBe('ready');
    expect(result[1].status).toBe('not_installed');
  });

  /**
   * Purpose: Validates that the repository list method is called
   */
  it('+ should call repository list method', async () => {
    mockRepo.list.mockResolvedValue([]);
    await scannerEnginesService.list();
    expect(mockRepo.list).toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that multiple engines are returned correctly
   */
  it('+ should return multiple engines', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'semgrep', name: 'Semgrep' },
      { id: 'bandit', name: 'Bandit' },
      { id: 'cppcheck', name: 'Cppcheck' },
      { id: 'gosec', name: 'Gosec' },
      { id: 'eslint-security', name: 'ESLint Security' },
    ]);
    const result = await scannerEnginesService.list();
    expect(result).toHaveLength(5);
  });

  /**
   * Purpose: Validates that the order of engines matches the repository
   */
  it('+ should preserve engine order from repository', async () => {
    const engines = [
      { id: 'semgrep', name: 'Semgrep' },
      { id: 'bandit', name: 'Bandit' },
    ];
    mockRepo.list.mockResolvedValue(engines);
    const result = await scannerEnginesService.list();
    expect(result[0].id).toBe('semgrep');
    expect(result[1].id).toBe('bandit');
  });
});

describe('scannerEnginesService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an engine is returned by its ID
   */
  it('+ should return engine by id', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep', name: 'Semgrep', command: 'semgrep scan', format: 'json', isAvailable: true, status: 'ready' });
    const result = await scannerEnginesService.getById('semgrep');
    expect(result.name).toBe('Semgrep');
    expect(result.id).toBe('semgrep');
  });

  /**
   * Purpose: Validates that the repository is called with the correct engine ID
   */
  it('+ should call repo with correct id', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'bandit' });
    await scannerEnginesService.getById('bandit');
    expect(mockRepo.getById).toHaveBeenCalledWith('bandit');
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for nonexistent engines
   */
  it('- should throw NOT_FOUND when engine does not exist', async () => {
    mockRepo.getById.mockResolvedValue(null);
    await expect(scannerEnginesService.getById('nonexistent')).rejects.toThrow('Scanner engine not found');
  });

  /**
   * Purpose: Validates that the command field is returned for an engine
   */
  it('+ should return engine with command field', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep', command: 'semgrep scan --config auto' });
    const result = await scannerEnginesService.getById('semgrep');
    expect(result.command).toBe('semgrep scan --config auto');
  });

  /**
   * Purpose: Validates that the format field is returned for an engine
   */
  it('+ should return engine with format field', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep', format: 'semgrep-json' });
    const result = await scannerEnginesService.getById('semgrep');
    expect(result.format).toBe('semgrep-json');
  });

  /**
   * Purpose: Validates that the isAvailable field is returned for an engine
   */
  it('+ should return engine with isAvailable field', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep', isAvailable: true });
    const result = await scannerEnginesService.getById('semgrep');
    expect(result.isAvailable).toBe(true);
  });

  /**
   * Purpose: Validates that the outputStream field is returned for an engine
   */
  it('+ should return engine with outputStream field', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep', outputStream: 'stdout' });
    const result = await scannerEnginesService.getById('semgrep');
    expect(result.outputStream).toBe('stdout');
  });

  /**
   * Purpose: Validates that the repository getById method is called
   */
  it('+ should call repository getById method', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'cppcheck' });
    await scannerEnginesService.getById('cppcheck');
    expect(mockRepo.getById).toHaveBeenCalledWith('cppcheck');
  });

  /**
   * Purpose: Validates that different IDs return different engine data
   */
  it('+ should return different engines for different ids', async () => {
    mockRepo.getById.mockImplementation((id) => Promise.resolve({ id, name: `Engine ${id}` }));
    const result1 = await scannerEnginesService.getById('semgrep');
    const result2 = await scannerEnginesService.getById('bandit');
    expect(result1.id).toBe('semgrep');
    expect(result2.id).toBe('bandit');
  });

  /**
   * Purpose: Validates that the error includes NOT_FOUND code and 404 status
   */
  it('- should throw error with NOT_FOUND code', async () => {
    mockRepo.getById.mockResolvedValue(null);
    try {
      await scannerEnginesService.getById('nonexistent');
    } catch (error: any) {
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    }
  });

  /**
   * Purpose: Validates that all required engine fields are present in the response
   */
  it('+ should return engine with all required fields', async () => {
    mockRepo.getById.mockResolvedValue({
      id: 'semgrep',
      name: 'Semgrep',
      command: 'semgrep scan',
      format: 'json',
      outputStream: 'stdout',
      isAvailable: true,
      status: 'ready',
    });

    const result = await scannerEnginesService.getById('semgrep');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('format');
    expect(result).toHaveProperty('outputStream');
    expect(result).toHaveProperty('isAvailable');
    expect(result).toHaveProperty('status');
  });

  /**
   * Purpose: Validates that different ID formats are handled correctly
   */
  it('+ should handle getById with different id formats', async () => {
    mockRepo.getById.mockImplementation((id) => Promise.resolve({ id }));

    const r1 = await scannerEnginesService.getById('semgrep');
    const r2 = await scannerEnginesService.getById('bandit');
    const r3 = await scannerEnginesService.getById('cppcheck');

    expect(r1.id).toBe('semgrep');
    expect(r2.id).toBe('bandit');
    expect(r3.id).toBe('cppcheck');
  });

  /**
   * Purpose: Validates that mixed status engines are returned correctly
   */
  it('+ should handle list returning engines with different statuses', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'semgrep', status: 'ready' },
      { id: 'bandit', status: 'not_installed' },
      { id: 'cppcheck', status: 'ready' },
    ]);

    const result = await scannerEnginesService.list();
    expect(result[0].status).toBe('ready');
    expect(result[1].status).toBe('not_installed');
    expect(result[2].status).toBe('ready');
  });

  /**
   * Purpose: Validates that engines with different availability states are handled
   */
  it('+ should handle list with mixed availability', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'semgrep', isAvailable: true },
      { id: 'bandit', isAvailable: false },
    ]);

    const result = await scannerEnginesService.list();
    expect(result[0].isAvailable).toBe(true);
    expect(result[1].isAvailable).toBe(false);
  });

  /**
   * Purpose: Validates that multiple list calls are handled independently
   */
  it('+ should call list multiple times independently', async () => {
    mockRepo.list.mockResolvedValue([{ id: 'semgrep' }]);
    await scannerEnginesService.list();
    await scannerEnginesService.list();
    expect(mockRepo.list).toHaveBeenCalledTimes(2);
  });

  /**
   * Purpose: Validates that multiple getById calls are handled independently
   */
  it('+ should call getById multiple times independently', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'semgrep' });
    await scannerEnginesService.getById('semgrep');
    await scannerEnginesService.getById('bandit');
    expect(mockRepo.getById).toHaveBeenCalledTimes(2);
  });

  /**
   * Purpose: Validates that engines with empty commands are handled gracefully
   */
  it('+ should handle list with empty command strings', async () => {
    mockRepo.list.mockResolvedValue([{ id: 'test', command: '', format: '' }]);
    const result = await scannerEnginesService.list();
    expect(result[0].command).toBe('');
  });

  /**
   * Purpose: Validates that custom outputStream values are returned
   */
  it('+ should handle getById returning engine with custom outputStream', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'custom', outputStream: 'stderr' });
    const result = await scannerEnginesService.getById('custom');
    expect(result.outputStream).toBe('stderr');
  });

  /**
   * Purpose: Validates that a large number of engines are handled correctly
   */
  it('+ should handle list with many engines', async () => {
    const engines = Array.from({ length: 20 }, (_, i) => ({ id: `engine-${i}`, name: `Engine ${i}` }));
    mockRepo.list.mockResolvedValue(engines);

    const result = await scannerEnginesService.list();
    expect(result).toHaveLength(20);
  });

  /**
   * Purpose: Validates that IDs with special characters are handled
   */
  it('+ should handle getById with特殊字符 in id', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'test-engine_v2' });
    const result = await scannerEnginesService.getById('test-engine_v2');
    expect(result.id).toBe('test-engine_v2');
  });

  /**
   * Purpose: Validates that the engine order is preserved in the response
   */
  it('+ should handle list preserving order', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);

    const result = await scannerEnginesService.list();
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
    expect(result[2].id).toBe('c');
  });

  /**
   * Purpose: Validates that engines with missing properties are handled gracefully
   */
  it('+ should handle getById with undefined properties', async () => {
    mockRepo.getById.mockResolvedValue({ id: 'partial' });
    const result = await scannerEnginesService.getById('partial');
    expect(result.id).toBe('partial');
    expect(result.name).toBeUndefined();
  });

  /**
   * Purpose: Validates that all supported scanner types are returned correctly
   */
  it('+ should handle list with all scanner types', async () => {
    mockRepo.list.mockResolvedValue([
      { id: 'semgrep', name: 'Semgrep', command: 'semgrep scan --config auto --json', format: 'semgrep-json' },
      { id: 'bandit', name: 'Bandit', command: 'bandit -r . -f json', format: 'bandit-json' },
      { id: 'cppcheck', name: 'Cppcheck', command: 'cppcheck --xml', format: 'cppcheck-xml' },
      { id: 'gosec', name: 'Gosec', command: 'gosec -fmt json ./...', format: 'gosec-json' },
      { id: 'eslint-security', name: 'ESLint Security', command: 'eslint --plugin security', format: 'eslint-json' },
    ]);

    const result = await scannerEnginesService.list();
    expect(result).toHaveLength(5);
    expect(result.map((e: any) => e.id)).toEqual(['semgrep', 'bandit', 'cppcheck', 'gosec', 'eslint-security']);
  });
});
