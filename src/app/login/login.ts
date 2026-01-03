import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  submitting = signal(false);
  hidePw = signal(true);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false]
  });
  get f() { return this.form.controls; }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const ok = this.auth.login(email!, password!);
      if (ok) {
        this.router.navigate(['/shop']);
      } else {
        alert('Pogresan email ili lozinka');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
