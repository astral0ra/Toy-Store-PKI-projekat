import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

  // service is available globally 
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Holds currently logged-in user (or null if not logged in)
  // signal makes UI react automatically when value changes
  currentUser = signal<User | null>(null);

  constructor() {
    // On app startup, try to restore the currently logged-in user from localStorage
    const saved = localStorage.getItem('currentUser');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  // Returns the full list of users stored locally in localStorage
  // If there are no users yet, return empty array
  private list(): User[] {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }

  // Saves the provided users array back into localStorage
  private saveList(users: User[]) {
    localStorage.setItem('users', JSON.stringify(users));
  }

  // Normalizes email so comparisons are consistent - removes spaces, makes lowercase and prevent duplicates
  private norm(email: string) { return email.trim().toLowerCase(); }

  // Creates new user and logs them immediately
  signup(user: User): void {
    const users = this.list();
    const email = this.norm(user.email);
  // Check if a user with the same normalized email already exists
    if (users.some(u => this.norm(u.email) === email)) {
      throw new Error('User with this email already exists');
    }
  // Store normalized email in the record
    const record: User = { ...user, email };
  // Save user in user list
    users.push(record);
    this.saveList(users);
  // Set as current logged in user and continue the session
    this.currentUser.set(record);
    localStorage.setItem('currentUser', JSON.stringify(record));
  }
  // Attempts login - returns true if credentials match / returns false if not found/wrong credentials
  login(email: string, password: string): boolean {
    const e = this.norm(email);
    const u = this.list().find(x => this.norm(x.email) === e && x.password === password);
    if (!u) return false;
  // If the match is found, save as current user and continue
    this.currentUser.set(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
    return true;
  }
  // Logs out user, clears currentUser signal and removes the session from LS
  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
  }
  // Updates profile data for the currently logged in user and patch contains only fields that changed
  updateProfile(patch: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;

    const users = this.list();
    
    // If patch has an email, normalize it, otherwise keep current email
    const nextEmail = patch.email ? this.norm(patch.email) : current.email;

    // If email is changing, ensure it doesnt collide with another account
    if (nextEmail !== current.email) {
      const exists = users.some(u => this.norm(u.email) === nextEmail);
      if (exists) throw new Error('A user with this email already exists');
    }

    // Merge old user and changes, force normalized email
    const updated: User = { ...current, ...patch, email: nextEmail };
    // Replace user in the stored list (match by email)
    const updatedList = users.map(u => this.norm(u.email) === this.norm(current.email) ? updated : u);

    //Change everywhere
    this.saveList(updatedList);
    this.currentUser.set(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
  }
  // Return true if someone is logged in
  isLoggedIn(): boolean {
    return !!this.currentUser();
  }
  // Return all stored users
  getAllUsers(): User[] {
    return this.list();
  }
}
