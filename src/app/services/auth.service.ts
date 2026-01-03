import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);

  constructor() {
    const saved = localStorage.getItem('currentUser');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  private list(): User[] {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }
  private saveList(users: User[]) {
    localStorage.setItem('users', JSON.stringify(users));
  }

  private norm(email: string) { return email.trim().toLowerCase(); }

  signup(user: User): void {
    const users = this.list();
    const email = this.norm(user.email);
    if (users.some(u => this.norm(u.email) === email)) {
      throw new Error('User with this email already exists');
    }
    const record: User = { ...user, email };
    users.push(record);
    this.saveList(users);
    this.currentUser.set(record);
    localStorage.setItem('currentUser', JSON.stringify(record));
  }

  login(email: string, password: string): boolean {
    const e = this.norm(email);
    const u = this.list().find(x => this.norm(x.email) === e && x.password === password);
    if (!u) return false;
    this.currentUser.set(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
  }

  updateProfile(patch: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;

    const users = this.list();
    const nextEmail = patch.email ? this.norm(patch.email) : current.email;

    if (nextEmail !== current.email) {
      const exists = users.some(u => this.norm(u.email) === nextEmail);
      if (exists) throw new Error('A user with this email already exists');
    }

    const updated: User = { ...current, ...patch, email: nextEmail };
    const updatedList = users.map(u => this.norm(u.email) === this.norm(current.email) ? updated : u);

    this.saveList(updatedList);
    this.currentUser.set(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  getAllUsers(): User[] {
    return this.list();
  }
}
