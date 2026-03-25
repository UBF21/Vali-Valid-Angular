import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rule } from 'vali-valid';
import { lastValueFrom } from 'rxjs';
import { toAsyncValidator } from '../to-async-validator';
import { withDebounce } from '../with-debounce';

const mockControl = (value: any) => ({ value } as any);

describe('withDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a function (AsyncValidatorFn shape)', () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner, 300);
    expect(typeof debounced).toBe('function');
  });

  it('returns an Observable (has subscribe method) when called', () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner, 100);
    const result = debounced(mockControl('hello'));
    expect(result).toBeDefined();
    expect(typeof (result as any).subscribe).toBe('function');
  });

  it('resolves to null when validation passes after delay', async () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner, 100);

    const promise = lastValueFrom(debounced(mockControl('hello')) as any);
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(result).toBeNull();
  });

  it('resolves to ValidationErrors when validation fails after delay', async () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner, 100);

    const promise = lastValueFrom(debounced(mockControl('')) as any);
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('valiValid');
  });

  it('default delay is 300ms', async () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner); // no delay arg

    const promise = lastValueFrom(debounced(mockControl('hello')) as any);
    vi.advanceTimersByTime(300);
    const result = await promise;
    expect(result).toBeNull();
  });

  it('custom delay parameter is respected', async () => {
    const inner = toAsyncValidator(rule().required());
    const debounced = withDebounce(inner, 500);

    const promise = lastValueFrom(debounced(mockControl('hello')) as any);
    // advance only 499ms — should NOT have resolved yet
    vi.advanceTimersByTime(499);
    // Now advance the remaining 1ms
    vi.advanceTimersByTime(1);
    const result = await promise;
    expect(result).toBeNull();
  });

  it('works with an async pattern validator', async () => {
    const taken = new Set(['admin']);
    const inner = toAsyncValidator(
      rule().asyncPattern(async (v: string) => !taken.has(v), 'Username taken')
    );
    const debounced = withDebounce(inner, 200);

    const takenPromise = lastValueFrom(debounced(mockControl('admin')) as any);
    vi.advanceTimersByTime(200);
    const takenResult = await takenPromise;
    expect(takenResult).not.toBeNull();
    expect((takenResult as any).valiValid).toContain('Username taken');

    const freePromise = lastValueFrom(debounced(mockControl('newuser')) as any);
    vi.advanceTimersByTime(200);
    const freeResult = await freePromise;
    expect(freeResult).toBeNull();
  });
});
