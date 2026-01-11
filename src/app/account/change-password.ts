import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

// Validator to compare new passwords: compares "newPassword" and "confirmPassword" inside a FormGroup
// If they match, return null (valid). If not, return an error object { mismatch: true }
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPw = group.get('newPassword')?.value || '';
  const repeat = group.get('confirmPassword')?.value || '';
  return newPw === repeat ? null : { mismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  // standalone component imports, required for template to compile
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './change-password.html',
  styleUrl: './account.css'  // reuse same style
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // oldPassword: user must type current password
  // passwordGroup: nested group for new pw + confirm pw, with cross-field validator
  form: FormGroup = this.fb.group({
    oldPassword: ['', Validators.required],
    passwordGroup: this.fb.group({
  // at least one letter and one number
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatch })
  });

  // state signals
  saving = signal(false);
  message = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  get f() { return this.form.controls as any; }

  // pwg.newPassword / pwg.confirmPassword for nested passwordGroup controls
  get pwg() { return (this.form.get('passwordGroup') as FormGroup).controls as any; }

  submit() {
  //Reset message every time
    this.message.set(null);
    this.errorMsg.set(null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    //Must be logged in to change password
    const user = this.auth.currentUser();
    if (!user) {
      this.errorMsg.set('Morate biti prijavljeni.');
      return;
    }

    //Read all current form valuies
    const v = this.form.getRawValue();
    //Check if old pass matches what's stored locally
    if (v.oldPassword !== user.password) {
      this.errorMsg.set('Stara lozinka nije tačna.');
      return;
    }
    //Start saving
    this.saving.set(true);
    try {
      this.auth.updateProfile({ password: v.passwordGroup.newPassword });
      this.message.set('Lozinka uspešno promenjena.');
      this.form.reset();
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Greška pri čuvanju.');
    } finally {
      this.saving.set(false);
    }
  }

  back() {
    this.router.navigate(['/account']);
  }
}
