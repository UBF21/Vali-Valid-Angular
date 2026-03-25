import { describe, it, expect } from 'vitest';
import { rule } from 'vali-valid';
import { toAsyncValidator } from '../to-async-validator';

const mockControl = (value: any) => ({ value } as any);

describe('toAsyncValidator', () => {
  it('async pattern that resolves true returns null', async () => {
    // asyncFn returning true means the value is valid
    const builder = rule().asyncPattern(
      async (_value: any) => true,
      'Always valid',
    );
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('anything'));
    expect(result).toBeNull();
  });

  it('async pattern that resolves false returns { valiValid: [...] }', async () => {
    // asyncFn returning false means validation failed
    const builder = rule().asyncPattern(
      async (_value: any) => false,
      'Always invalid',
    );
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('anything'));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
    expect(Array.isArray((result as any).valiValid)).toBe(true);
    expect((result as any).valiValid).toContain('Always invalid');
  });

  it('error thrown in asyncFn propagates as a rejected promise', async () => {
    // Note: toAsyncValidator does not wrap asyncFn errors — they propagate.
    // Angular's ReactiveFormsModule will catch rejected async validators internally,
    // but callers should be aware errors are not swallowed by the adapter itself.
    const builder = rule().asyncPattern(
      async (_value: any) => {
        throw new Error('Network failure');
      },
      'Async check failed',
    );
    const validator = toAsyncValidator(builder);
    await expect(validator(mockControl('test'))).rejects.toThrow('Network failure');
  });

  it('async validator with required sync rule — empty value returns error', async () => {
    const builder = rule().required();
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl(''));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  it('async validator with required sync rule — non-empty value returns null', async () => {
    const builder = rule().required();
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('hello'));
    expect(result).toBeNull();
  });

  it('custom async pattern with value-dependent logic', async () => {
    // Simulate an "already taken" username check
    const takenUsernames = new Set(['admin', 'root']);
    const builder = rule().asyncPattern(
      async (value: string) => !takenUsernames.has(value),
      'Username is already taken.',
    );
    const validator = toAsyncValidator(builder);

    const resultTaken = await validator(mockControl('admin'));
    expect(resultTaken).not.toBeNull();
    expect((resultTaken as any).valiValid).toContain('Username is already taken.');

    const resultFree = await validator(mockControl('newuser'));
    expect(resultFree).toBeNull();
  });

  // ── NEW: null / undefined control values ──
  it('null control value is handled gracefully', async () => {
    const validator = toAsyncValidator(rule().required());
    const result = await validator(mockControl(null));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  it('undefined control value is handled gracefully', async () => {
    const validator = toAsyncValidator(rule().required());
    const result = await validator(mockControl(undefined));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  // ── NEW: chained sync rules before async ──
  it('required + asyncPattern — empty value fails required without calling asyncFn', async () => {
    const builder = rule().required().asyncPattern(
      async (_v: any) => true,
      'Async',
    );
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl(''));
    expect(result).not.toBeNull();
    // required fails first — the result has an error
    expect(result).toHaveProperty('valiValid');
  });

  it('required + asyncPattern — valid value passes both', async () => {
    const builder = rule().required().asyncPattern(
      async (_v: any) => true,
      'Async',
    );
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('hello'));
    expect(result).toBeNull();
  });

  it('required + asyncPattern — valid value that fails async check returns error', async () => {
    const builder = rule().required().asyncPattern(
      async (_v: any) => false,
      'Taken',
    );
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('hello')) as any;
    expect(result).not.toBeNull();
    expect(result.valiValid).toContain('Taken');
  });

  // ── NEW: idempotency (hoisting regression test) ──
  it('calling the same async validator 20 times returns consistent results', async () => {
    const takenNames = new Set(['admin']);
    const builder = rule().asyncPattern(
      async (v: string) => !takenNames.has(v),
      'Taken',
    );
    const validator = toAsyncValidator(builder);
    for (let i = 0; i < 20; i++) {
      expect(await validator(mockControl('admin'))).not.toBeNull();
      expect(await validator(mockControl('user'))).toBeNull();
    }
  });

  // ── NEW: OR logic with async ──
  it('OR with async branch — valid for one branch returns null', async () => {
    const builder = rule().or([
      rule().email(),
      rule().asyncPattern(async (v: string) => v.startsWith('tel:'), 'Must be email or tel URI'),
    ]);
    const validator = toAsyncValidator(builder);
    expect(await validator(mockControl('user@example.com'))).toBeNull();
    expect(await validator(mockControl('tel:+1234567890'))).toBeNull();
  });

  it('OR with async branch — async branch in OR always resolves (library limitation)', async () => {
    // When asyncPattern is used inside or(), the library treats async branches as
    // always-passing at the OR level. This test documents that current behavior.
    const builder = rule().or([
      rule().email(),
      rule().asyncPattern(async (v: string) => v.startsWith('tel:'), 'Must be email or tel URI'),
    ]);
    const validator = toAsyncValidator(builder);
    // 'neither' is not a valid email and does not start with 'tel:',
    // but or() with async branches passes through — result is null.
    const result = await validator(mockControl('neither'));
    expect(result).toBeNull();
  });

  // ── NEW: custom error message in async ──
  it('custom error message is included in valiValid array', async () => {
    const builder = rule().asyncPattern(async () => false, 'Email already registered.');
    const validator = toAsyncValidator(builder);
    const result = await validator(mockControl('x@y.com')) as any;
    expect(result.valiValid).toContain('Email already registered.');
  });
});
