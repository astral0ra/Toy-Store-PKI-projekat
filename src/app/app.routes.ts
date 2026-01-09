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
import { FavoriteToys } from './favorite-toys/favorite-toys';

export const routes: Routes = [
  { path: '', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: 'change-password', component: ChangePassword, canActivate: [authGuard] },
  { path: 'favorites', component: FavoriteToys, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'home', component: Home },
  { path: 'shop', component: Shop },
  { path: 'login', component: Login },
  { path: 'cart', component: Cart },
  { path: 'toy/:id', component: Toy },
  { path: 'signup', component: Signup },
  { path: '**', redirectTo: 'shop' }
];


