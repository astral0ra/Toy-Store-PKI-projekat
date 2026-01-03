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

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value || '';
  const cpw = group.get('confirmPassword')?.value || '';
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

  submitting = signal(false);
  loadingTypes = signal(true);
  types = signal<TypeModel[]>([]);

  countries = [
    { code: 'BG', name: 'Beograd' },
    { code: 'NS', name: 'Novi Sad' },
    { code: 'NI', name: 'Niš' },
    { code: 'SU', name: 'Subotica' },
    { code: 'KG', name: 'Kragujevac' },
    { code: 'VA', name: 'Valjevo' }
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
    favouriteTypes: [[] as number[]]
  });

  get f() { return this.form.controls as any; }
  get pwg() { return (this.form.get('passwordGroup') as FormGroup).controls as any; }
  get addr() { return (this.form.get('address') as FormGroup).controls as any; }

  async ngOnInit() {
    try {
      const res = await axios.get('https://toy.pequla.com/api/type');
      this.types.set(res.data);
    } catch (err) {
      console.error('Failed to load types:', err);
    } finally {
      this.loadingTypes.set(false);
    }
  }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    try {
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
      this.router.navigate(['/shop']);
    } catch (err) {
      console.error(err);
    } finally {
      this.submitting.set(false);
    }
  }
}
