import { beforeEach, describe, expect, it, vi } from 'vitest';

// The template_settings column arrives with a migration. Until that has been
// run, PostgREST rejects the whole write because of the unknown column -- so
// without a fallback, shipping this change would break saving outright on a
// database nobody had migrated yet. These tests pin that behaviour down,
// since it cannot be exercised against the real database.

const upsert = vi.fn();
const select = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ upsert, select }),
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  }),
}));

const MISSING_COLUMN = {
  code: 'PGRST204',
  message: "Could not find the 'template_settings' column of 'employees' in the schema cache",
};

const employee = {
  id: 'baby-generic',
  name: 'BABY',
  role: '',
  photoUrl: '',
  photoScale: 1,
  photoPosition: { x: 0, y: 0 },
  dateStr: '',
  activationCircleSize: 180,
} as never;

beforeEach(() => {
  upsert.mockReset();
  vi.resetModules();
});

describe('upsertEmployee before the migration has run', () => {
  it('retries without template_settings instead of failing the save', async () => {
    const { upsertEmployee } = await import('../services/supabase');

    upsert
      .mockReturnValueOnce({ select: async () => ({ data: null, error: MISSING_COLUMN }) })
      .mockReturnValueOnce({ select: async () => ({ data: [{ id: 'baby-generic' }], error: null }) });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await upsertEmployee(employee);

    expect(upsert).toHaveBeenCalledTimes(2);
    // First attempt carries the blob; the retry drops only that key and keeps
    // everything the table already knew how to store.
    expect(upsert.mock.calls[0][0]).toHaveProperty('template_settings');
    expect(upsert.mock.calls[1][0]).not.toHaveProperty('template_settings');
    expect(upsert.mock.calls[1][0]).toMatchObject({ id: 'baby-generic', name: 'BABY' });
    expect(result).toEqual([{ id: 'baby-generic' }]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('template_settings'));
    warn.mockRestore();
  });

  it('warns once, not on every keystroke', async () => {
    const { upsertEmployee } = await import('../services/supabase');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    upsert.mockImplementation((row: Record<string, unknown>) => ({
      select: async () => ('template_settings' in row
        ? { data: null, error: MISSING_COLUMN }
        : { data: [{ id: 'baby-generic' }], error: null }),
    }));

    await upsertEmployee(employee);
    await upsertEmployee(employee);
    await upsertEmployee(employee);

    expect(warn.mock.calls.filter(c => String(c[0]).includes('template_settings'))).toHaveLength(1);
    warn.mockRestore();
  });

  it('still throws on a real failure rather than swallowing it', async () => {
    const { upsertEmployee } = await import('../services/supabase');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    upsert.mockReturnValue({
      select: async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }),
    });

    await expect(upsertEmployee(employee)).rejects.toMatchObject({ message: 'permission denied' });
    expect(upsert).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});

describe('upsertEmployee after the migration', () => {
  it('writes the blob in one call', async () => {
    const { upsertEmployee } = await import('../services/supabase');
    upsert.mockReturnValue({ select: async () => ({ data: [{ id: 'baby-generic' }], error: null }) });

    await upsertEmployee(employee);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toHaveProperty('template_settings.activationCircleSize', 180);
  });
});
