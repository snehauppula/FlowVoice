import * as Yup from "yup";

export const E164 = /^\+[1-9][0-9]{6,14}$/;

export const phoneSchema = Yup.string()
  .trim()
  .matches(E164, "Use international format, e.g. +919876543210")
  .required("Phone number is required");

export const PAGE_SIZE = 20;

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Escapes characters that are special in PostgREST filters and ilike patterns. */
export function likeTerm(q: string): string {
  return q.trim().slice(0, 80).replace(/[%_\\,()*]/g, "\\$&");
}
