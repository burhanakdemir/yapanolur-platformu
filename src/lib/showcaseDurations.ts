import { z } from "zod";

/** Vitrin süre seçenekleri (gün): 3, 5, bir hafta, 15, bir ay */
export const SHOWCASE_DAY_VALUES = [3, 5, 7, 15, 30] as const;
export type ShowcaseDayValue = (typeof SHOWCASE_DAY_VALUES)[number];

const allowed = new Set<number>(SHOWCASE_DAY_VALUES);

export function isShowcaseDay(value: number): value is ShowcaseDayValue {
  return allowed.has(value);
}

export const SHOWCASE_DAY_OPTIONS: ReadonlyArray<{ value: ShowcaseDayValue; label: string }> = [
  { value: 3, label: "3 gun" },
  { value: 5, label: "5 gun" },
  { value: 7, label: "1 hafta (7 gun)" },
  { value: 15, label: "15 gun" },
  { value: 30, label: "1 ay (30 gun)" },
];

export const showcaseDaysZ = z.union([
  z.literal(3),
  z.literal(5),
  z.literal(7),
  z.literal(15),
  z.literal(30),
]);
