import type { FormBuilder, FormGroup, FormControl, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import type { RuleBuilder } from 'vali-valid';
import { toValidator } from './to-validator';
import { toAsyncValidator } from './to-async-validator';

export interface FieldGroupConfig<T = any> {
  initial?: T;
  validator?: RuleBuilder;
  asyncValidator?: RuleBuilder;
}

export type FormGroupConfig<T extends Record<string, any> = Record<string, any>> = {
  [K in keyof T]: FieldGroupConfig<T[K]>;
};

type TypedControls<T extends Record<string, any>> = {
  [K in keyof T]: FormControl<T[K] | null>;
};

/**
 * Builds a typed Angular FormGroup from a vali-valid field config map.
 *
 * @example
 * interface LoginForm { email: string; password: string; }
 *
 * this.form = toFormGroup<LoginForm>(this.fb, {
 *   email: { initial: '', validator: rule().required().email() },
 *   password: { initial: '', validator: rule().required().minLength(8) },
 * });
 *
 * // Fully typed:
 * this.form.controls.email.value  // string | null
 */
export function toFormGroup<T extends Record<string, any> = Record<string, any>>(
  fb: FormBuilder,
  config: FormGroupConfig<T>,
): FormGroup<TypedControls<T>> {
  const controls: Record<string, any> = {};

  for (const [field, fieldConfig] of Object.entries(config)) {
    const syncValidators: ValidatorFn[] = fieldConfig.validator
      ? [toValidator(fieldConfig.validator)]
      : [];

    const asyncValidators: AsyncValidatorFn[] = fieldConfig.asyncValidator
      ? [toAsyncValidator(fieldConfig.asyncValidator)]
      : [];

    controls[field] = fb.control(
      fieldConfig.initial ?? '',
      { validators: syncValidators, asyncValidators },
    );
  }

  return fb.group(controls) as unknown as FormGroup<TypedControls<T>>;
}
