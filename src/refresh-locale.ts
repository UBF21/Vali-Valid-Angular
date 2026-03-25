import type { FormGroup } from '@angular/forms';
import { setLocale } from 'vali-valid';
import type { Locale } from 'vali-valid';

/**
 * Sets the vali-valid locale and forces Angular to re-run all validators
 * in the provided FormGroup so that error messages update immediately
 * without requiring a value change.
 *
 * Angular's ValidatorFn only re-executes when the control value changes.
 * This helper patches each control with `updateValueAndValidity({ emitEvent: true })`
 * to bypass that limitation and reflect the new locale right away.
 *
 * @param locale - Target locale: 'en' | 'es' | 'pt' | 'fr' | 'de'
 * @param form   - The FormGroup whose validators should be refreshed
 *
 * @example
 * import { refreshLocale } from 'vali-valid-angular';
 *
 * switchLocale(l: string) {
 *   this.locale = l;
 *   refreshLocale(l, this.form);
 * }
 */
export function refreshLocale(locale: string, form: FormGroup): void {
  setLocale(locale as Locale);
  Object.values(form.controls).forEach(ctrl =>
    ctrl.updateValueAndValidity({ emitEvent: true, onlySelf: false }),
  );
}
