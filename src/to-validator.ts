import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { RuleBuilder } from 'vali-valid';
import { ValiValid } from 'vali-valid';

/**
 * Converts a vali-valid rule() builder into an Angular sync ValidatorFn.
 *
 * @example
 * this.form = this.fb.group({
 *   email: ['', toValidator(rule().required().email())],
 * });
 */
export function toValidator(builder: RuleBuilder): ValidatorFn {
  const engine = new ValiValid<{ _: any }>([
    { field: '_', validations: builder.build() },
  ]);
  return (control: AbstractControl): ValidationErrors | null => {
    const errors = engine.validateSync({ _: control.value ?? '' });
    if (!errors._ || errors._.length === 0) return null;
    return { valiValid: errors._ };
  };
}
