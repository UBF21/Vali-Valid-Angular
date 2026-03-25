import { describe, it, expect } from 'vitest';
import { rule } from 'vali-valid';
import { toFormGroup } from '../to-form-group';

/**
 * Minimal FormBuilder mock.
 * fb.control captures (initial, validators, asyncValidators).
 * fb.group captures the controls record and returns it wrapped.
 */
const mockFb = {
  control: (initial: any, options?: { validators?: any[]; asyncValidators?: any[] }) => ({
    initial,
    validators: options?.validators ?? [],
    asyncValidators: options?.asyncValidators ?? [],
  }),
  group: (controls: any) => ({ controls }),
} as any;

describe('toFormGroup', () => {
  it('creates controls for each field in the config', () => {
    const result = toFormGroup(mockFb, {
      email: { initial: '' },
      username: { initial: 'guest' },
    }) as any;

    expect(result.controls).toHaveProperty('email');
    expect(result.controls).toHaveProperty('username');
    expect(Object.keys(result.controls)).toHaveLength(2);
  });

  it('passes the correct initial value to each control', () => {
    const result = toFormGroup(mockFb, {
      name: { initial: 'John' },
      age: { initial: 0 },
    }) as any;

    expect(result.controls.name.initial).toBe('John');
    expect(result.controls.age.initial).toBe(0);
  });

  it('defaults initial value to empty string when not provided', () => {
    const result = toFormGroup(mockFb, {
      field: {},
    }) as any;

    expect(result.controls.field.initial).toBe('');
  });

  it('applies sync validators when a validator RuleBuilder is provided', () => {
    const result = toFormGroup(mockFb, {
      email: {
        initial: '',
        validator: rule().required().email(),
      },
    }) as any;

    const { validators } = result.controls.email;
    expect(Array.isArray(validators)).toBe(true);
    expect(validators).toHaveLength(1);
    expect(typeof validators[0]).toBe('function');
  });

  it('applies async validators when an asyncValidator RuleBuilder is provided', () => {
    const builder = rule().asyncPattern(
      async (_v: any) => true,
      'Async check',
    );
    const result = toFormGroup(mockFb, {
      username: {
        initial: '',
        asyncValidator: builder,
      },
    }) as any;

    const { asyncValidators } = result.controls.username;
    expect(Array.isArray(asyncValidators)).toBe(true);
    expect(asyncValidators).toHaveLength(1);
    expect(typeof asyncValidators[0]).toBe('function');
  });

  it('fields with no validators get empty validator arrays', () => {
    const result = toFormGroup(mockFb, {
      notes: { initial: 'some text' },
    }) as any;

    expect(result.controls.notes.validators).toEqual([]);
    expect(result.controls.notes.asyncValidators).toEqual([]);
  });

  it('applies both sync and async validators to the same field', () => {
    const result = toFormGroup(mockFb, {
      username: {
        initial: '',
        validator: rule().required().minLength(3),
        asyncValidator: rule().asyncPattern(
          async (_v: any) => true,
          'Available',
        ),
      },
    }) as any;

    const { validators, asyncValidators } = result.controls.username;
    expect(validators).toHaveLength(1);
    expect(asyncValidators).toHaveLength(1);
  });

  it('the produced sync validator actually validates the field value', () => {
    const result = toFormGroup(mockFb, {
      email: {
        initial: '',
        validator: rule().required().email(),
      },
    }) as any;

    const syncValidator = result.controls.email.validators[0];

    // Simulate what Angular would do: call the ValidatorFn with a mock control
    const validControl = { value: 'user@example.com' } as any;
    const invalidControl = { value: '' } as any;

    expect(syncValidator(validControl)).toBeNull();
    expect(syncValidator(invalidControl)).not.toBeNull();
    expect(syncValidator(invalidControl)).toHaveProperty('valiValid');
  });

  it('the produced async validator actually validates the field value', async () => {
    const takenNames = new Set(['admin']);
    const result = toFormGroup(mockFb, {
      username: {
        initial: '',
        asyncValidator: rule().asyncPattern(
          async (v: string) => !takenNames.has(v),
          'Username taken',
        ),
      },
    }) as any;

    const asyncValidator = result.controls.username.asyncValidators[0];

    const takenResult = await asyncValidator({ value: 'admin' } as any);
    expect(takenResult).not.toBeNull();
    expect((takenResult as any).valiValid).toContain('Username taken');

    const freeResult = await asyncValidator({ value: 'newuser' } as any);
    expect(freeResult).toBeNull();
  });

  it('handles multiple fields with mixed configurations', () => {
    const result = toFormGroup(mockFb, {
      firstName: { initial: '', validator: rule().required() },
      lastName: { initial: '' },
      email: { initial: '', validator: rule().required().email() },
    }) as any;

    expect(Object.keys(result.controls)).toHaveLength(3);
    expect(result.controls.firstName.validators).toHaveLength(1);
    expect(result.controls.lastName.validators).toHaveLength(0);
    expect(result.controls.email.validators).toHaveLength(1);
  });

  // ── NEW: falsy initial values are not overridden by ?? '' ──
  it('initial value of 0 is preserved (not replaced by empty string)', () => {
    const result = toFormGroup(mockFb, {
      count: { initial: 0 },
    }) as any;
    expect(result.controls.count.initial).toBe(0);
  });

  it('initial value of false is preserved', () => {
    const result = toFormGroup(mockFb, {
      active: { initial: false },
    }) as any;
    expect(result.controls.active.initial).toBe(false);
  });

  it('initial value of null defaults to empty string (null ?? "" = "")', () => {
    const result = toFormGroup(mockFb, {
      field: { initial: null },
    }) as any;
    expect(result.controls.field.initial).toBe('');
  });

  it('initial value of undefined defaults to empty string', () => {
    const result = toFormGroup(mockFb, {
      field: { initial: undefined },
    }) as any;
    expect(result.controls.field.initial).toBe('');
  });

  // ── NEW: OR logic validator works end-to-end ──
  it('OR logic validator — valid email passes', () => {
    const result = toFormGroup(mockFb, {
      contact: {
        initial: '',
        validator: rule().or([rule().email(), rule().phone()]),
      },
    }) as any;
    const validate = result.controls.contact.validators[0];
    expect(validate({ value: 'user@example.com' })).toBeNull();
  });

  it('OR logic validator — valid phone passes', () => {
    const result = toFormGroup(mockFb, {
      contact: {
        initial: '',
        validator: rule().or([rule().email(), rule().phone()]),
      },
    }) as any;
    const validate = result.controls.contact.validators[0];
    expect(validate({ value: '+1234567890' })).toBeNull();
  });

  it('OR logic validator — neither email nor phone fails', () => {
    const result = toFormGroup(mockFb, {
      contact: {
        initial: '',
        validator: rule().or([rule().email(), rule().phone()]),
      },
    }) as any;
    const validate = result.controls.contact.validators[0];
    expect(validate({ value: 'neither' })).not.toBeNull();
  });

  // ── NEW: custom error messages propagate ──
  it('custom error message reaches the valiValid array', () => {
    const result = toFormGroup(mockFb, {
      name: {
        initial: '',
        validator: rule().required('Name is required.'),
      },
    }) as any;
    const validate = result.controls.name.validators[0];
    const errors = validate({ value: '' });
    expect(errors.valiValid).toContain('Name is required.');
  });

  // ── NEW: multiple fields, each sync validator validates correctly ──
  it('each field validator is independent', () => {
    const result = toFormGroup(mockFb, {
      email: { initial: '', validator: rule().required().email() },
      username: { initial: '', validator: rule().required().minLength(3) },
    }) as any;

    const emailValidate = result.controls.email.validators[0];
    const usernameValidate = result.controls.username.validators[0];

    // email validator should reject non-email, not username rules
    expect(emailValidate({ value: 'user@example.com' })).toBeNull();
    expect(emailValidate({ value: 'not-email' })).not.toBeNull();

    // username validator should enforce minLength, not email
    expect(usernameValidate({ value: 'john' })).toBeNull();
    expect(usernameValidate({ value: 'ab' })).not.toBeNull();
    expect(usernameValidate({ value: 'user@example.com' })).toBeNull(); // email is a valid minLength(3) string
  });

  // ── NEW: no validator field but has asyncValidator ──
  it('field with only asyncValidator has empty sync validators array', () => {
    const result = toFormGroup(mockFb, {
      username: {
        initial: '',
        asyncValidator: rule().asyncPattern(async () => true, 'ok'),
      },
    }) as any;
    expect(result.controls.username.validators).toHaveLength(0);
    expect(result.controls.username.asyncValidators).toHaveLength(1);
  });

  // ── NEW: generic type narrows the config ──
  it('typed toFormGroup<T> accepts only keys of T', () => {
    // This is a compile-time test — if it compiles, the generic works.
    interface LoginForm { email: string; password: string; }
    const result = toFormGroup<LoginForm>(mockFb, {
      email: { initial: '', validator: rule().required().email() },
      password: { initial: '', validator: rule().required().minLength(8) },
    }) as any;
    expect(Object.keys(result.controls)).toEqual(['email', 'password']);
  });

  // ── NEW: array initial value ──
  it('array initial value is preserved', () => {
    const result = toFormGroup(mockFb, {
      tags: { initial: ['a', 'b'] },
    }) as any;
    expect(result.controls.tags.initial).toEqual(['a', 'b']);
  });

  // ── NEW: many fields (10) ──
  it('handles 10 fields correctly', () => {
    const config = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`field${i}`, { initial: `value${i}` }])
    );
    const result = toFormGroup(mockFb, config) as any;
    expect(Object.keys(result.controls)).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(result.controls[`field${i}`].initial).toBe(`value${i}`);
    }
  });
});
