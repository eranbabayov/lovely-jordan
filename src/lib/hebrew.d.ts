export interface HebrewUnit {
  one: string;
  two: string;
  many: string;
}

export declare function formatCountdown(remainingMs: number): string;

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export declare function splitDuration(remainingMs: number): Duration;
export declare function formatClock(remainingMs: number): string;

export declare const units: {
  DAYS: HebrewUnit;
  HOURS: HebrewUnit;
  MINUTES: HebrewUnit;
  plural: (n: number, unit: HebrewUnit) => string;
  clock: (ms: number) => string;
};
