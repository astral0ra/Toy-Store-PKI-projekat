import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
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
  styleUrl: './login.css',
  encapsulation: ViewEncapsulation.None
})
export class Login {
  // Inject FormBuilder to create a reactive form
  private fb = inject(FormBuilder);

  // Inject authentication service
  private auth = inject(AuthService);

  // Inject router to navigate after login
  private router = inject(Router);

  // Signal that controls loading state during login
  submitting = signal(false);

  // Signal that controls whether password is hidden or visible
  hidePw = signal(true);

  // Reactive form definition
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false]
  });
  //Shortcut getter for form controls in template
  get f() { return this.form.controls; }

  //Called when user submits the login form
  async submit() {
  // If form is invalid, show validation errors and stop
    if (this.form.invalid) {
    this.form.markAllAsTouched();
    return; }
  // Set loading state
    this.submitting.set(true);
    try {
  // Extract email and password from the form
      const { email, password } = this.form.getRawValue();
  //Attempt login via AuthService
      const ok = this.auth.login(email!, password!);
  //On success, redirect to shop page
      if (ok) {
        this.router.navigate(['/shop']);
      } else {
  // Show error if credentials are incorrect
        alert('Pogresan email ili lozinka');
      }
    } finally {
  //Always reset loading state
      this.submitting.set(false);
    }
  }
}
