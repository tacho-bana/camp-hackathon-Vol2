import { get } from "./client";
import type { EnemyResponse, WaveResponse } from "../types/api";

export async function getEnemies(): Promise<EnemyResponse[]> {
  return get<EnemyResponse[]>("/enemies/");
}

export async function getWave(id: string): Promise<WaveResponse> {
  return get<WaveResponse>(`/enemies/wave/${id}`);
}
