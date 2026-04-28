import { post } from "./client";
import type { BaseResponse, GameStateResponse } from "../types/api";

export async function postGameBase(lat: number, lng: number): Promise<BaseResponse> {
  return post<BaseResponse>("/game/base", { lat, lng });
}

export async function postGameStart(difficulty: 1 | 2 | 3): Promise<GameStateResponse> {
  return post<GameStateResponse>("/game/start", { difficulty });
}

export async function postGameClear(): Promise<void> {
  await post<unknown>("/game/clear");
}

export async function postGameEnd(): Promise<void> {
  await post<unknown>("/game/end");
}
