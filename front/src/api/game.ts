import { post } from "./client";
import type { GameStateResponse } from "../types/api";

export async function postGameBase(lat: number, lng: number): Promise<GameStateResponse> {
  return post<GameStateResponse>("/game/base", { lat, lng });
}

export async function postGameStart(difficulty: number): Promise<GameStateResponse> {
  return post<GameStateResponse>("/game/start", { difficulty });
}

export async function postGameClear(): Promise<void> {
  await post<unknown>("/game/clear");
}

export async function postGameEnd(): Promise<void> {
  await post<unknown>("/game/end");
}
