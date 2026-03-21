import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:dev@localhost:5432/vanta";

// Connection pool for queries
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

export { schema };
