import axios from "axios";
import { ToyModel } from "../models/toy.model";

const client = axios.create({
    baseURL: 'https://toy.pequla.com/api/toy',
    validateStatus: (status: number) => status === 200
});

export class ToyService {
  static async getAllToys(): Promise<ToyModel[]> {
    const { data } = await client.get<ToyModel[]>('/');
    return data;
  }

  static async getToysByIds(ids: number[]): Promise<ToyModel[]> {
    if (!ids || ids.length === 0) return [];
    const { data } = await client.post<ToyModel[]>('/list', ids);
    return data;
  }
}

