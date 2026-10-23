import { createContext, useContext } from "react";
import type { DataStore, Entity, Mutation, UserProfile } from "./types";
export type EditorKind =
  | "sale"
  | "order"
  | "expense"
  | "customer"
  | "product"
  | "ingredient"
  | "material"
  | "recipe"
  | "goal";
export interface Business {
  data: DataStore;
  profile: UserProfile;
  canWrite: boolean;
  busy: boolean;
  online: boolean;
  period: string;
  save: (changes: Mutation[], description: string) => Promise<void>;
  edit: (kind: EditorKind, record?: Entity) => void;
  remove: (
    collection: import("./types").CollectionName,
    record: Entity,
    description: string,
  ) => void;
  notify: (message: string, error?: boolean) => void;
}
export const BusinessContext = createContext<Business | null>(null);
export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("Contexto indisponível.");
  return context;
}
