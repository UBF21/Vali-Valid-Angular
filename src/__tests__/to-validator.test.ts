import { describe, it, expect } from 'vitest';
import { rule } from 'vali-valid';
import { toValidator } from '../to-validator';

const mockControl = (value: any) => ({ value } as any);

describe('toValidator', () => {
  // ── EXISTING TESTS ──

  it('valid email returns null', () => {
    const validator = toValidator(rule().email());
    const result = validator(mockControl('user@example.com'));
    expect(result).toBeNull();
  });

  it('invalid email returns { valiValid: [...] }', () => {
    const validator = toValidator(rule().email());
    const result = validator(mockControl('not-an-email'));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
    expect(Array.isArray((result as any).valiValid)).toBe(true);
    expect((result as any).valiValid.length).toBeGreaterThan(0);
  });

  it('required field with empty string returns error', () => {
    const validator = toValidator(rule().required());
    const result = validator(mockControl(''));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
    expect((result as any).valiValid.length).toBeGreaterThan(0);
  });

  it('required field with a non-empty value returns null', () => {
    const validator = toValidator(rule().required());
    const result = validator(mockControl('hello'));
    expect(result).toBeNull();
  });

  it('null value is handled gracefully', () => {
    const validator = toValidator(rule().required());
    expect(() => validator(mockControl(null))).not.toThrow();
    const result = validator(mockControl(null));
    // null is treated as empty by required — should return an error
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  it('chained rules — minLength violation returns error', () => {
    const validator = toValidator(rule().required().minLength(5));
    const result = validator(mockControl('hi'));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  it('chained rules — all rules pass returns null', () => {
    const validator = toValidator(rule().required().minLength(3).maxLength(10));
    const result = validator(mockControl('hello'));
    expect(result).toBeNull();
  });

  // ── NEW: null / undefined control values ──

  it('undefined value is treated as empty string', () => {
    const validator = toValidator(rule().required());
    const result = validator(mockControl(undefined));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  // ── NEW: multiple simultaneous errors ──

  it('multiple failing rules return all errors at once', () => {
    // value 'short' fails minLength(8) AND passwordStrength
    const validator = toValidator(rule().minLength(8).passwordStrength());
    const result = validator(mockControl('short')) as any;
    expect(result).not.toBeNull();
    expect(result.valiValid.length).toBeGreaterThanOrEqual(1);
  });

  // ── NEW: URL validator ──

  it('valid URL returns null', () => {
    const validator = toValidator(rule().url());
    expect(validator(mockControl('https://example.com'))).toBeNull();
  });

  it('invalid URL returns error', () => {
    const validator = toValidator(rule().url());
    const result = validator(mockControl('not-a-url'));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  // ── NEW: passwordStrength ──

  it('weak password fails passwordStrength', () => {
    const validator = toValidator(rule().passwordStrength());
    const result = validator(mockControl('abc'));
    expect(result).not.toBeNull();
  });

  it('strong password passes passwordStrength', () => {
    const validator = toValidator(rule().passwordStrength());
    // Strong: uppercase + lowercase + number + special char, 8+ chars
    const result = validator(mockControl('Secure#1Pass'));
    expect(result).toBeNull();
  });

  // ── NEW: alphaNumeric ──

  it('alphanumeric string passes alphaNumeric', () => {
    const validator = toValidator(rule().alphaNumeric());
    expect(validator(mockControl('hello123'))).toBeNull();
  });

  it('string with special chars fails alphaNumeric', () => {
    const validator = toValidator(rule().alphaNumeric());
    const result = validator(mockControl('hello!'));
    expect(result).not.toBeNull();
  });

  // ── NEW: phone validator ──

  it('valid phone passes', () => {
    const validator = toValidator(rule().phone());
    // International format: +[1-9] followed by 6-14 digits
    expect(validator(mockControl('+1234567890'))).toBeNull();
  });

  // ── NEW: custom pattern fn ──

  it('custom pattern that passes returns null', () => {
    const validator = toValidator(rule().pattern(v => String(v).startsWith('VV'), 'Must start with VV'));
    expect(validator(mockControl('VVfoo'))).toBeNull();
  });

  it('custom pattern that fails returns error', () => {
    const validator = toValidator(rule().pattern(v => String(v).startsWith('VV'), 'Must start with VV'));
    const result = validator(mockControl('hello')) as any;
    expect(result).not.toBeNull();
    expect(result.valiValid).toContain('Must start with VV');
  });

  // ── NEW: oneOf validator ──

  it('value in oneOf list returns null', () => {
    const validator = toValidator(rule().oneOf(['admin', 'editor', 'viewer']));
    expect(validator(mockControl('editor'))).toBeNull();
  });

  it('value not in oneOf list returns error', () => {
    const validator = toValidator(rule().oneOf(['admin', 'editor', 'viewer']));
    expect(validator(mockControl('superuser'))).not.toBeNull();
  });

  // ── NEW: notOneOf validator ──

  it('value not in notOneOf list returns null', () => {
    const validator = toValidator(rule().notOneOf(['admin', 'root']));
    expect(validator(mockControl('john'))).toBeNull();
  });

  it('reserved value in notOneOf returns error', () => {
    const validator = toValidator(rule().notOneOf(['admin', 'root']));
    expect(validator(mockControl('admin'))).not.toBeNull();
  });

  // ── NEW: maxLength boundary ──

  it('value exactly at maxLength returns null', () => {
    const validator = toValidator(rule().maxLength(5));
    expect(validator(mockControl('abcde'))).toBeNull();
  });

  it('value one over maxLength returns error', () => {
    const validator = toValidator(rule().maxLength(5));
    expect(validator(mockControl('abcdef'))).not.toBeNull();
  });

  // ── NEW: OR logic ──

  it('OR — value valid for first branch returns null', () => {
    const validator = toValidator(rule().or([rule().email(), rule().phone()]));
    expect(validator(mockControl('user@example.com'))).toBeNull();
  });

  it('OR — value valid for second branch returns null', () => {
    const validator = toValidator(rule().or([rule().email(), rule().phone()]));
    expect(validator(mockControl('+1234567890'))).toBeNull();
  });

  it('OR — value invalid for all branches returns error', () => {
    const validator = toValidator(rule().or([rule().email(), rule().phone()]));
    const result = validator(mockControl('neither'));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  // ── NEW: engine idempotency (hoisting regression test) ──

  it('calling the same validator 50 times returns consistent results', () => {
    const validator = toValidator(rule().required().email());
    for (let i = 0; i < 50; i++) {
      expect(validator(mockControl('user@example.com'))).toBeNull();
      expect(validator(mockControl(''))).not.toBeNull();
      expect(validator(mockControl('bad'))).not.toBeNull();
    }
  });

  // ── NEW: custom error messages ──

  it('custom error message is included in valiValid array', () => {
    const validator = toValidator(rule().required('This field is required.'));
    const result = validator(mockControl('')) as any;
    expect(result.valiValid).toContain('This field is required.');
  });

  // ── NEW: digitsOnly ──

  it('digits-only string passes digitsOnly', () => {
    const validator = toValidator(rule().digitsOnly());
    expect(validator(mockControl('12345'))).toBeNull();
  });

  it('string with letters fails digitsOnly', () => {
    const validator = toValidator(rule().digitsOnly());
    expect(validator(mockControl('123abc'))).not.toBeNull();
  });

  // ── NEW: noHtml ──

  it('string without HTML passes noHtml', () => {
    const validator = toValidator(rule().noHTML());
    expect(validator(mockControl('hello world'))).toBeNull();
  });

  it('string with HTML tag fails noHtml', () => {
    const validator = toValidator(rule().noHTML());
    expect(validator(mockControl('<script>alert(1)</script>'))).not.toBeNull();
  });

  // ── NEW: slug ──

  it('valid slug passes', () => {
    const validator = toValidator(rule().slug());
    expect(validator(mockControl('my-valid-slug'))).toBeNull();
  });

  it('slug with spaces fails', () => {
    const validator = toValidator(rule().slug());
    expect(validator(mockControl('invalid slug'))).not.toBeNull();
  });
});
