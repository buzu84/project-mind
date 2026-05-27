/**
 * Re-export layer for Supabase database types.
 *
 * Import from here (not from database.types.ts directly) so that
 * the rest of the app is insulated from regeneration churn.
 *
 * The generated file is `./database.types.ts` — do not edit it manually.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database.types";
