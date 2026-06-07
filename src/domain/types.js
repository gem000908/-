export const PERIODS = ["weekly", "monthly", "yearly"];
export const DATA_VERSION = 1;

export function isPeriod(value) {
  return PERIODS.includes(value);
}
