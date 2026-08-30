import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges conditional classes and lets a caller's className override a
// component's defaults instead of both landing in the class list and the
// winner being decided by stylesheet order.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
