import { get, post } from "./client";
import type { StructureApiType, StructureResponse } from "../types/api";

export async function postStructure(
  kind: StructureApiType,
  lat: number,
  lng: number,
): Promise<StructureResponse> {
  return post<StructureResponse>("/structures/", { type: kind, lat, lng });
}

export async function getStructures(): Promise<StructureResponse[]> {
  return get<StructureResponse[]>("/structures/");
}
