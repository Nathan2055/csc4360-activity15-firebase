import crypto from "node:crypto";

export function generateId(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now(): number {
  return Date.now();
}

export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

export function fromJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

export function createParticipantUrl(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
