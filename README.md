# vali-valid-angular

Angular adapter for [vali-valid](https://www.npmjs.com/package/vali-valid) — use `rule()` builders as Angular `ValidatorFn` and `AsyncValidatorFn`, fully compatible with Angular Reactive Forms (`FormBuilder`, `FormGroup`, `FormControl`).

---

## Installation

```bash
npm install vali-valid vali-valid-angular
```

> **Note:** `vali-valid` must be version **≥ 3.0.0**. Earlier versions do not expose the `RuleBuilder` API or the `validateSync` / `validate` methods required by this adapter.

---

## Usage

### 1. `toValidator()` — Sync validation with FormBuilder

`toValidator()` wraps a `rule()` builder chain into an Angular `ValidatorFn`. Use it wherever Angular expects a synchronous validator.

```ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { rule } from 'vali-valid';
import { toValidator } from 'vali-valid-angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', toValidator(rule().required().email())],
      password: ['', toValidator(rule().required().minLength(8))],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

---

### 2. `toAsyncValidator()` — Async validation (e.g. username availability check)

`toAsyncValidator()` wraps a `rule()` builder chain that includes `asyncPattern()` into an Angular `AsyncValidatorFn`. Angular will wait for the promise to resolve before updating the control's validity state.

```ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { rule } from 'vali-valid';
import { toValidator, toAsyncValidator } from 'vali-valid-angular';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: UserApiService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: [
        '',
        toValidator(rule().required().minLength(3).maxLength(20)),
        [
          toAsyncValidator(
            rule().asyncPattern(
              async (value) => {
                const taken = await this.api.checkUsername(value);
                return !taken; // return true = valid, false = invalid
              },
              'Username is already taken.'
            )
          ),
        ],
      ],
    });
  }
}
```

---

### 3. `toFormGroup()` — Build a full FormGroup from a config map

`toFormGroup()` lets you describe an entire form's fields, initial values, sync validators, and async validators in a single config object. It returns a ready-to-use Angular `FormGroup`.

```ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { rule } from 'vali-valid';
import { toFormGroup } from 'vali-valid-angular';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
})
export class SignupComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: UserApiService) {}

  ngOnInit(): void {
    this.form = toFormGroup(this.fb, {
      email: {
        initial: '',
        validator: rule().required().email(),
      },
      username: {
        initial: '',
        validator: rule().required().minLength(3).maxLength(20),
        asyncValidator: rule().asyncPattern(
          async (value) => {
            const taken = await this.api.checkUsername(value);
            return !taken;
          },
          'Username is already taken.'
        ),
      },
      password: {
        initial: '',
        validator: rule().required().minLength(8),
      },
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

---

## Displaying validation errors in templates

When a validator fails, the error is stored under the `valiValid` key as an array of error message strings. Use `*ngIf` and `*ngFor` to render them:

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">

  <div>
    <label>Email</label>
    <input formControlName="email" type="email" />
    <div *ngIf="form.get('email')?.errors?.['valiValid'] as errs">
      <p *ngFor="let msg of errs">{{ msg }}</p>
    </div>
  </div>

  <div>
    <label>Username</label>
    <input formControlName="username" />
    <div *ngIf="form.get('username')?.errors?.['valiValid'] as errs">
      <p *ngFor="let msg of errs">{{ msg }}</p>
    </div>
    <p *ngIf="form.get('username')?.status === 'PENDING'">Checking availability…</p>
  </div>

  <div>
    <label>Password</label>
    <input formControlName="password" type="password" />
    <div *ngIf="form.get('password')?.errors?.['valiValid'] as errs">
      <p *ngFor="let msg of errs">{{ msg }}</p>
    </div>
  </div>

  <button type="submit" [disabled]="form.invalid || form.pending">Sign up</button>

</form>
```

The `errs` variable is an array of strings so that multiple validation messages can be shown at once if the builder chain includes more than one failing rule.

---

### 4. `refreshLocale()` — Switch language and instantly update error messages

Angular's `ValidatorFn` only re-executes when a control value changes. If you call `setLocale()` directly, the error messages in the form won't update until the user types something. `refreshLocale()` fixes this by calling `setLocale()` and immediately forcing every control in the `FormGroup` to re-run its validators.

```ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { rule } from 'vali-valid';
import { toFormGroup, refreshLocale } from 'vali-valid-angular';

@Component({
  selector: 'app-locale-switcher',
  template: `
    <div>
      <button *ngFor="let l of locales" (click)="switchLocale(l)">{{ l.toUpperCase() }}</button>
    </div>
    <form [formGroup]="form" (ngSubmit)="form.markAllAsTouched()">
      <input formControlName="name" placeholder="Name" />
      <p *ngFor="let e of form.get('name')?.errors?.['valiValid']">{{ e }}</p>

      <input formControlName="email" placeholder="Email" />
      <p *ngFor="let e of form.get('email')?.errors?.['valiValid']">{{ e }}</p>

      <button type="submit">Validate</button>
    </form>
  `,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class LocaleSwitcherComponent implements OnInit {
  form!: FormGroup;
  locale = 'en';
  locales = ['en', 'es', 'pt', 'fr', 'de'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = toFormGroup(this.fb, {
      name:  { initial: '', validator: rule().required().minLength(3) },
      email: { initial: '', validator: rule().required().email() },
    });
  }

  switchLocale(l: string): void {
    this.locale = l;
    // Sets the global locale AND re-runs all validators in this.form
    refreshLocale(l, this.form);
  }
}
```

Under the hood `refreshLocale` calls `setLocale(locale)` then iterates over `form.controls` calling `ctrl.updateValueAndValidity({ emitEvent: true })` on each one so Angular's change-detection picks up the new error strings immediately.

---

## Why a separate package?

**Vue** and **Svelte** work naturally with the `ValiValid` engine: both frameworks accept plain validation functions or reactive state without any ceremony, so a thin wrapper in userland is usually enough.

**Angular Reactive Forms** are fundamentally different. They have their own rigid contract:

- `FormBuilder`, `FormGroup`, and `FormControl` are Angular-specific classes.
- Validators must conform to the `ValidatorFn` signature `(control: AbstractControl) => ValidationErrors | null`.
- Async validators must conform to `AsyncValidatorFn` and return `Promise<ValidationErrors | null>` or `Observable<ValidationErrors | null>`.
- Controls integrate with Angular's change-detection cycle and status model (`VALID`, `INVALID`, `PENDING`, `DISABLED`).

A real adapter — not just a utility function — is required to bridge `vali-valid`'s `RuleBuilder` and `ValiValid` engine to Angular's form system. That is exactly what `vali-valid-angular` provides.

---

## API reference

| Export | Type | Description |
|---|---|---|
| `toValidator(builder)` | `ValidatorFn` | Wraps a `RuleBuilder` as a sync Angular validator |
| `toAsyncValidator(builder)` | `AsyncValidatorFn` | Wraps a `RuleBuilder` as an async Angular validator |
| `toFormGroup(fb, config)` | `FormGroup` | Builds a `FormGroup` from a `FormGroupConfig` map |
| `refreshLocale(locale, form)` | `void` | Sets locale globally and forces all controls in the FormGroup to re-run validators immediately |
| `FieldGroupConfig` | interface | Shape of a single field entry in `toFormGroup` |
| `FormGroupConfig` | type | `Record<string, FieldGroupConfig>` |

---

## Requirements

| Peer dependency | Minimum version |
|---|---|
| `vali-valid` | `3.0.0` |
| `@angular/forms` | `15.0.0` |
| `@angular/common` | `15.0.0` |
| `@angular/core` | `15.0.0` |

---

## License

MIT
