import axios from "axios";
import { ToyModel } from "../models/toy.model";
/**
 * Axios client configured for the Toy API.
 * baseURL means we can call client.get('/') instead of repeating the full URL.
 * validateStatus restricts success only to HTTP 200 (everything else becomes an error-like response).
 */
const client = axios.create({
    baseURL: 'https://toy.pequla.com/api/toy',
    validateStatus: (status: number) => status === 200
});

/**
 * ToyService is a small API wrapper.
 * We keep all toy-related HTTP calls in one place so components stay clean.
 */

export class ToyService {
  // Get /api/toy/ and return array of all toys (ToyModel)
  static async getAllToys(): Promise<ToyModel[]> {
  // Axios responses have the shape { data, status, headers, ... }
    const { data } = await client.get<ToyModel[]>('/');
    return data;
  }

  // POST /api/toy/list, return toys that match that ID
  static async getToysByIds(ids: number[]): Promise<ToyModel[]> {

  // Defensive check: if ids is empty, there is nothing to fetch
    if (!ids || ids.length === 0) return [];

    const { data } = await client.post<ToyModel[]>('/list', ids);
    return data;
  }
}

