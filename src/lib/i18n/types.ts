import type { Locale } from "./config";
import pl from "@/messages/pl.json";

type DeepStringValues<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? DeepStringValues<Item>[]
    : T extends object
      ? { [Key in keyof T]: DeepStringValues<T[Key]> }
      : T;

export type { Locale };
export type Dictionary = DeepStringValues<typeof pl>;
