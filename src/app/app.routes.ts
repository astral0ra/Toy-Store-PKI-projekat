import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Shop } from './shop/shop';
import { Login } from './login/login';
import { Account } from './account/account';
import { Cart } from './cart/cart';
import { Toy } from './toy/toy';
import { Signup } from './signup/signup';
import { Orders } from './orders/orders';
import { authGuard } from './guard/auth.guard';
import { ChangePassword } from './account/change-password';
import { Component } from '@angular/core';

const Placeholder = Component({
  standalone: true,
  template: '<div class="auth-wrap"><div class="auth-card"><h1>Uskoro</h1></div></div>'
})(class {});

export const routes: Routes = [
  { path: '', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: 'change-password', component: ChangePassword, canActivate: [authGuard] },
  { path: 'favorites', component: Placeholder, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'home', component: Home },
  { path: 'shop', component: Shop },
  { path: 'login', component: Login },
  { path: 'cart', component: Cart },
  { path: 'toy/:id', component: Toy },
  { path: 'signup', component: Signup },
  { path: '**', redirectTo: 'shop' }
];


