import type { AsyncValidatorFn } from '@angular/forms';
import { timer, switchMap, from } from 'rxjs';

/**
 * Wraps an AsyncValidatorFn with a debounce delay (default 300 ms).
 * Use this with toAsyncValidator() when the async check makes an HTTP request.
 *
 * @example
 * asyncValidators: [withDebounce(toAsyncValidator(rule().asyncPattern(checkEmail, 'Email taken')))]
 *
 * @param validator - An Angular AsyncValidatorFn to debounce
 * @param delayMs   - Debounce delay in milliseconds (default: 300)
 */
export function withDebounce(validator: AsyncValidatorFn, delayMs = 300): AsyncValidatorFn {
  return (control) =>
    timer(delayMs).pipe(
      switchMap(() => from(Promise.resolve(validator(control)))),
    );
}
