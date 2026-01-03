export interface User {
  name: string;
  surname: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  city?: string;
  favouriteTypes?: number[];
  data?: any[];
}