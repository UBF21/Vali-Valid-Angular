import type { AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import type { RuleBuilder } from 'vali-valid';
import { ValiValid } from 'vali-valid';

/**
 * Converts a vali-valid rule() builder into an Angular AsyncValidatorFn.
 * Use this when your rule chain includes asyncPattern().
 *
 * @example
 * this.form = this.fb.group({
 *   username: ['',
 *     toValidator(rule().required().minLength(3)),
 *     [withDebounce(toAsyncValidator(rule().asyncPattern(this.checkAvailable, 'Username taken')))]
 *   ],
 * });
 */
export function toAsyncValidator(builder: RuleBuilder): AsyncValidatorFn {
  const engine = new ValiValid<{ _: any }>([
    { field: '_', validations: builder.build() },
  ]);
  return async (control: AbstractControl): Promise<ValidationErrors | null> => {
    const errors = await engine.validateAsync({ _: control.value ?? '' });
    if (!errors._ || errors._.length === 0) return null;
    return { valiValid: errors._ };
  };
}
