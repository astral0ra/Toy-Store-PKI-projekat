import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TypeModel } from '../models/type.model';
import axios from 'axios';

// Custom validator: checks if password and confirmPassword are the same
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value || '';
  const cpw = group.get('confirmPassword')?.value || '';

  // If they match, validation passes (null). If not, returns an error object.
  return pw === cpw ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

// UI state signals
  submitting = signal(false);     // true while form is being submitted
  loadingTypes = signal(true);    // true while loading types from API
  types = signal<TypeModel[]>([]); // list of types from API (for dropdown)


  countries = [
    { code: 'BG', name: 'Beograd' },
    { code: 'NS', name: 'Novi Sad' },
    { code: 'NI', name: 'Niš' },
    { code: 'SU', name: 'Subotica' },
    { code: 'KG', name: 'Kragujevac' },
    { code: 'VA', name: 'Valjevo' },
    { code: 'SD', name: 'Smederevo' }

  ];

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    surname: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.maxLength(30)]],
    passwordGroup: this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatch }),
    address: this.fb.group({
      city: ['', Validators.required],
      street: ['', Validators.required],
      number: ['', [Validators.required, Validators.pattern(/^\d+[A-Za-z]?$/)]]
    }),
    
    // Multi-select list of favorite type IDs
    favouriteTypes: [[] as number[]]
  });

  get f() { return this.form.controls as any; }
  get pwg() { return (this.form.get('passwordGroup') as FormGroup).controls as any; }
  get addr() { return (this.form.get('address') as FormGroup).controls as any; }

  async ngOnInit() {
    try {
      const res = await axios.get('https://toy.pequla.com/api/type');
      // Save API data into signal   
      this.types.set(res.data);
    } catch (err) {
      console.error('Failed to load types:', err);
    } finally {
      // stop even if API fails
      this.loadingTypes.set(false);
    }
  }

  // called on submit
  async submit() {
  // block if invalid and force validation messages to appear
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
  // disable button / show loading state  
  this.submitting.set(true);
    try {
 // getRawValue reads values from the full form, including nested groups
      const v = this.form.getRawValue();
      this.auth.signup({
        name: v.name!,
        surname: v.surname!,
        email: v.email!,
        password: v.passwordGroup.password!,
        phone: v.phone || '',
        address: `${v.address.street} ${v.address.number}, ${v.address.city}`,
        favouriteTypes: v.favouriteTypes || []
      });
    // After signup, user is logged in, redirect to shop
      this.router.navigate(['/shop']);
    } catch (err) {

      // signup() throws if email already exists
      console.error(err);
    } finally {

      // Re-enable the submit button
      this.submitting.set(false);
    }
  }
}
