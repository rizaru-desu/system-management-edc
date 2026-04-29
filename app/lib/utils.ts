type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flatMap((input): string[] => {
      if (!input) return [];
      if (typeof input === "string" || typeof input === "number") {
        return [String(input)];
      }
      if (Array.isArray(input)) return [cn(...input)];

      return Object.entries(input)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    })
    .filter(Boolean)
    .join(" ");
}
