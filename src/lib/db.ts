// @ts-nocheck
/**
 * Prisma-compatible proxy over @supabase/supabase-js REST API.
 *
 * Every file that does `import { prisma } from "@/lib/db"` continues to work
 * without changes. The proxy translates Prisma query patterns into Supabase
 * PostgREST calls.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase client (singleton)
// ---------------------------------------------------------------------------
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://plmduabtivmideutigkk.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbWR1YWJ0aXZtaWRldXRpZ2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTk3ODYsImV4cCI6MjA5NTY3NTc4Nn0.eLfpiH27waJTz9yhckxvGWFjzdWmFUtDJHTrZOROLuA";

const globalForPrisma = globalThis as unknown as { prisma: any; _supabase: SupabaseClient };

function getSupabase(): SupabaseClient {
  if (!globalForPrisma._supabase) {
    globalForPrisma._supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return globalForPrisma._supabase;
}

// ---------------------------------------------------------------------------
// Prisma camelCase property → PascalCase Supabase table name
// ---------------------------------------------------------------------------
const MODEL_TABLE_MAP: Record<string, string> = {
  user: "User",
  service: "Service",
  serviceItem: "ServiceItem",
  song: "Song",
  songUsageLog: "SongUsageLog",
  songArrangement: "SongArrangement",
  teamAssignment: "TeamAssignment",
  serviceTemplate: "ServiceTemplate",
  availability: "Availability",
  notification: "Notification",
  appSettings: "AppSettings",
  pPDevice: "PPDevice",
};

// ---------------------------------------------------------------------------
// Relation metadata — maps relation name to { table, fk, type }
// Based on the Prisma schema foreign keys.
// ---------------------------------------------------------------------------
interface RelationMeta {
  table: string;
  /** The FK column on the *child* side */
  fk: string;
  /** 'one' = belongsTo (FK lives on current table), 'many' = hasMany (FK lives on related table) */
  type: "one" | "many";
  /** For hasMany: which column on the parent is referenced (defaults to 'id') */
  refCol?: string;
}

const RELATION_MAP: Record<string, Record<string, RelationMeta>> = {
  User: {
    assignments: { table: "TeamAssignment", fk: "userId", type: "many" },
    availability: { table: "Availability", fk: "userId", type: "many" },
    notifications: { table: "Notification", fk: "userId", type: "many" },
    assignedItems: { table: "ServiceItem", fk: "assigneeId", type: "many" },
  },
  Service: {
    template: { table: "ServiceTemplate", fk: "templateId", type: "one" },
    items: { table: "ServiceItem", fk: "serviceId", type: "many" },
    assignments: { table: "TeamAssignment", fk: "serviceId", type: "many" },
  },
  ServiceItem: {
    service: { table: "Service", fk: "serviceId", type: "one" },
    song: { table: "Song", fk: "songId", type: "one" },
    arrangement: { table: "SongArrangement", fk: "arrangementId", type: "one" },
    assignee: { table: "User", fk: "assigneeId", type: "one" },
  },
  Song: {
    arrangements: { table: "SongArrangement", fk: "songId", type: "many" },
    serviceItems: { table: "ServiceItem", fk: "songId", type: "many" },
    usageLogs: { table: "SongUsageLog", fk: "songId", type: "many" },
  },
  SongUsageLog: {
    song: { table: "Song", fk: "songId", type: "one" },
  },
  SongArrangement: {
    song: { table: "Song", fk: "songId", type: "one" },
    serviceItems: { table: "ServiceItem", fk: "arrangementId", type: "many" },
  },
  TeamAssignment: {
    service: { table: "Service", fk: "serviceId", type: "one" },
    user: { table: "User", fk: "userId", type: "one" },
  },
  ServiceTemplate: {
    services: { table: "Service", fk: "templateId", type: "many" },
  },
  Availability: {
    user: { table: "User", fk: "userId", type: "one" },
  },
  Notification: {
    user: { table: "User", fk: "userId", type: "one" },
  },
};

// ---------------------------------------------------------------------------
// Build Supabase select string from Prisma's select / include
// ---------------------------------------------------------------------------
function buildSelectString(
  tableName: string,
  opts: { select?: Record<string, any>; include?: Record<string, any> }
): string {
  const { select, include } = opts;

  // If select is provided, only those columns + any include
  if (select) {
    const cols: string[] = [];
    for (const [key, val] of Object.entries(select)) {
      if (key === "_count") continue; // handled separately
      if (!val) continue;
      const rel = RELATION_MAP[tableName]?.[key];
      if (rel) {
        // Relation inside select — val can be { select: {...} } or true
        cols.push(buildRelationSelect(tableName, key, val === true ? {} : val));
      } else {
        cols.push(key);
      }
    }
    // Also process include if present alongside select
    if (include) {
      for (const [key, val] of Object.entries(include)) {
        if (key === "_count") continue;
        if (!val) continue;
        cols.push(buildRelationSelect(tableName, key, val === true ? {} : val));
      }
    }
    return cols.join(",") || "*";
  }

  // If only include, select * plus relations
  if (include) {
    const parts: string[] = ["*"];
    for (const [key, val] of Object.entries(include)) {
      if (key === "_count") continue;
      if (!val) continue;
      parts.push(buildRelationSelect(tableName, key, val === true ? {} : val));
    }
    return parts.join(",");
  }

  return "*";
}

function buildRelationSelect(
  parentTable: string,
  relationName: string,
  opts: any
): string {
  const rel = RELATION_MAP[parentTable]?.[relationName];
  if (!rel) return relationName;

  const innerSelect = opts.select || opts.include ? buildSelectString(rel.table, opts) : "*";

  // For belongsTo (FK on current table), use the FK column name as the join hint
  // For hasMany (FK on related table), use the table name
  if (rel.type === "one") {
    return `${relationName}:${rel.table}!${rel.fk}(${innerSelect})`;
  } else {
    return `${relationName}:${rel.table}!${rel.fk}(${innerSelect})`;
  }
}

// ---------------------------------------------------------------------------
// Apply Prisma `where` clause to a Supabase query builder
// ---------------------------------------------------------------------------
function applyWhere(query: any, where: Record<string, any> | undefined): any {
  if (!where) return query;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // Prisma operator object: { in: [...] }, { not: ... }, { gte: ..., lte: ... }, etc.
      for (const [op, operand] of Object.entries(value)) {
        switch (op) {
          case "in":
            query = query.in(key, operand as any[]);
            break;
          case "notIn":
            // PostgREST: not.in.(values)
            query = query.not(key, "in", `(${(operand as any[]).join(",")})`);
            break;
          case "not":
            if (operand === null) {
              query = query.not(key, "is", null);
            } else {
              query = query.neq(key, operand);
            }
            break;
          case "gt":
            query = query.gt(key, operand instanceof Date ? operand.toISOString() : operand);
            break;
          case "gte":
            query = query.gte(key, operand instanceof Date ? operand.toISOString() : operand);
            break;
          case "lt":
            query = query.lt(key, operand instanceof Date ? operand.toISOString() : operand);
            break;
          case "lte":
            query = query.lte(key, operand instanceof Date ? operand.toISOString() : operand);
            break;
          case "contains":
            query = query.ilike(key, `%${operand}%`);
            break;
          case "startsWith":
            query = query.ilike(key, `${operand}%`);
            break;
          case "endsWith":
            query = query.ilike(key, `%${operand}`);
            break;
          case "equals":
            if (operand === null) {
              query = query.is(key, null);
            } else {
              query = query.eq(key, operand);
            }
            break;
          default:
            // Unknown operator — treat as equality
            query = query.eq(key, operand);
        }
      }
    } else {
      // Direct value — equality
      query = query.eq(key, value instanceof Date ? value.toISOString() : value);
    }
  }

  return query;
}

// ---------------------------------------------------------------------------
// Apply Prisma `orderBy` to a Supabase query builder
// ---------------------------------------------------------------------------
function applyOrderBy(query: any, orderBy: any): any {
  if (!orderBy) return query;

  if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      query = applyOrderBy(query, item);
    }
    return query;
  }

  for (const [col, dir] of Object.entries(orderBy)) {
    query = query.order(col, { ascending: dir === "asc" });
  }
  return query;
}

// ---------------------------------------------------------------------------
// Apply ordering / filtering on nested relations (post-fetch)
// Supabase PostgREST doesn't support ordering/filtering on embedded resources
// the same way Prisma does, so we handle it after fetch.
// ---------------------------------------------------------------------------
function applyNestedOpts(rows: any[], tableName: string, include: Record<string, any> | undefined): any[] {
  if (!include) return rows;

  for (const [relName, opts] of Object.entries(include)) {
    if (relName === "_count" || !opts || opts === true) continue;
    if (typeof opts !== "object") continue;

    const relOpts = opts as { orderBy?: any; where?: any; include?: any; select?: any };

    for (const row of rows) {
      if (!row[relName] || !Array.isArray(row[relName])) continue;

      // Apply nested where filter
      if (relOpts.where) {
        row[relName] = row[relName].filter((child: any) => {
          return matchesWhere(child, relOpts.where);
        });
      }

      // Apply nested orderBy
      if (relOpts.orderBy) {
        const orders = Array.isArray(relOpts.orderBy) ? relOpts.orderBy : [relOpts.orderBy];
        row[relName].sort((a: any, b: any) => {
          for (const o of orders) {
            for (const [col, dir] of Object.entries(o)) {
              const asc = dir === "asc" ? 1 : -1;
              if (a[col] < b[col]) return -1 * asc;
              if (a[col] > b[col]) return 1 * asc;
            }
          }
          return 0;
        });
      }

      // Recursively handle nested include
      if (relOpts.include) {
        const rel = RELATION_MAP[tableName]?.[relName];
        if (rel) {
          row[relName] = applyNestedOpts(row[relName], rel.table, relOpts.include);
        }
      }
    }
  }

  return rows;
}

function matchesWhere(row: any, where: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (value === null) {
      if (row[key] !== null) return false;
    } else if (typeof value === "object" && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        switch (op) {
          case "not":
            if (operand === null) { if (row[key] === null) return false; }
            else { if (row[key] === operand) return false; }
            break;
          case "in":
            if (!(operand as any[]).includes(row[key])) return false;
            break;
          case "gt":
            if (!(row[key] > operand)) return false;
            break;
          case "gte":
            if (!(row[key] >= operand)) return false;
            break;
          case "lt":
            if (!(row[key] < operand)) return false;
            break;
          case "lte":
            if (!(row[key] <= operand)) return false;
            break;
          default:
            if (row[key] !== operand) return false;
        }
      }
    } else {
      if (row[key] !== value) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Handle Prisma _count in include — compute counts client-side
// ---------------------------------------------------------------------------
function applyCount(rows: any[], countSpec: Record<string, any> | undefined, tableName: string): void {
  if (!countSpec) return;
  const { select } = countSpec as { select?: Record<string, boolean> };
  if (!select) return;

  for (const row of rows) {
    row._count = {};
    for (const [relName, enabled] of Object.entries(select)) {
      if (!enabled) continue;
      row._count[relName] = Array.isArray(row[relName]) ? row[relName].length : 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Ensure _count relations are included in the select so we can count them
// ---------------------------------------------------------------------------
function ensureCountRelationsIncluded(
  include: Record<string, any> | undefined,
  tableName: string
): Record<string, any> | undefined {
  if (!include?._count?.select) return include;

  const merged = { ...include };
  const countSelect = include._count.select as Record<string, boolean>;

  for (const relName of Object.keys(countSelect)) {
    if (!merged[relName]) {
      // Include the relation minimally (just id) so we can count
      merged[relName] = true;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Fix belongsTo relations: Supabase returns them as arrays, Prisma returns objects/null
// ---------------------------------------------------------------------------
function fixRelationShapes(rows: any[], tableName: string, include: Record<string, any> | undefined): void {
  if (!include) return;

  for (const [relName, val] of Object.entries(include)) {
    if (relName === "_count" || !val) continue;
    const rel = RELATION_MAP[tableName]?.[relName];
    if (!rel) continue;

    for (const row of rows) {
      if (rel.type === "one") {
        // belongsTo: Supabase may return array with 1 element or null
        if (Array.isArray(row[relName])) {
          row[relName] = row[relName][0] || null;
        }
      }
      // For hasMany, it should already be an array
      if (rel.type === "many" && !Array.isArray(row[relName])) {
        row[relName] = row[relName] ? [row[relName]] : [];
      }
    }

    // Recurse into nested includes
    if (typeof val === "object" && val !== true && val.include) {
      for (const row of rows) {
        if (rel.type === "one" && row[relName]) {
          fixRelationShapes([row[relName]], rel.table, val.include);
        } else if (rel.type === "many" && Array.isArray(row[relName])) {
          fixRelationShapes(row[relName], rel.table, val.include);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Strip relation arrays when they were only pulled for _count and weren't
// originally requested
// ---------------------------------------------------------------------------
function stripCountOnlyRelations(
  rows: any[],
  originalInclude: Record<string, any> | undefined,
  countSpec: Record<string, any> | undefined
): void {
  if (!countSpec?.select) return;
  const countSelect = countSpec.select as Record<string, boolean>;

  for (const relName of Object.keys(countSelect)) {
    // If the original include didn't ask for this relation, remove it
    if (!originalInclude?.[relName]) {
      for (const row of rows) {
        delete row[relName];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Extract nested create data from Prisma's data object
// e.g. data.items = { create: [...] } → separate insert
// ---------------------------------------------------------------------------
interface NestedCreate {
  relationName: string;
  table: string;
  fk: string;
  data: any[];
}

function extractNestedCreates(tableName: string, data: Record<string, any>): { cleanData: Record<string, any>; nested: NestedCreate[] } {
  const cleanData: Record<string, any> = {};
  const nested: NestedCreate[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && value.create !== undefined) {
      const rel = RELATION_MAP[tableName]?.[key];
      if (rel && rel.type === "many") {
        const createData = Array.isArray(value.create) ? value.create : [value.create];
        nested.push({ relationName: key, table: rel.table, fk: rel.fk, data: createData });
      }
    } else {
      cleanData[key] = value;
    }
  }

  return { cleanData, nested };
}

// ---------------------------------------------------------------------------
// Create model delegate (the object returned by prisma.song, prisma.user, etc.)
// ---------------------------------------------------------------------------
function createModelDelegate(modelName: string, tableName: string) {
  const sb = () => getSupabase();

  return {
    // ----- findMany -----
    async findMany(args?: any) {
      const opts = args || {};
      const mergedInclude = ensureCountRelationsIncluded(opts.include, tableName);
      const selectStr = buildSelectString(tableName, { select: opts.select, include: mergedInclude });

      let query = sb().from(tableName).select(selectStr);
      query = applyWhere(query, opts.where);
      query = applyOrderBy(query, opts.orderBy);
      if (opts.take) query = query.limit(opts.take);
      if (opts.skip) query = query.range(opts.skip, opts.skip + (opts.take || 1000) - 1);

      const { data, error } = await query;
      if (error) throw new Error(`Supabase findMany ${tableName}: ${error.message}`);
      const rows = data || [];

      fixRelationShapes(rows, tableName, mergedInclude);
      applyNestedOpts(rows, tableName, mergedInclude);
      applyCount(rows, opts.include?._count, tableName);
      stripCountOnlyRelations(rows, opts.include, opts.include?._count);

      return rows;
    },

    // ----- findUnique -----
    async findUnique(args: any) {
      const opts = args || {};
      const mergedInclude = ensureCountRelationsIncluded(opts.include, tableName);
      const selectStr = buildSelectString(tableName, { select: opts.select, include: mergedInclude });

      let query = sb().from(tableName).select(selectStr);
      query = applyWhere(query, opts.where);
      query = query.maybeSingle();

      const { data, error } = await query;
      if (error) throw new Error(`Supabase findUnique ${tableName}: ${error.message}`);
      if (!data) return null;

      const rows = [data];
      fixRelationShapes(rows, tableName, mergedInclude);
      applyNestedOpts(rows, tableName, mergedInclude);
      applyCount(rows, opts.include?._count, tableName);
      stripCountOnlyRelations(rows, opts.include, opts.include?._count);

      return rows[0];
    },

    // ----- findFirst -----
    async findFirst(args?: any) {
      const opts = args || {};
      const mergedInclude = ensureCountRelationsIncluded(opts.include, tableName);
      const selectStr = buildSelectString(tableName, { select: opts.select, include: mergedInclude });

      let query = sb().from(tableName).select(selectStr);
      query = applyWhere(query, opts.where);
      query = applyOrderBy(query, opts.orderBy);
      query = query.limit(1).maybeSingle();

      const { data, error } = await query;
      if (error) throw new Error(`Supabase findFirst ${tableName}: ${error.message}`);
      if (!data) return null;

      const rows = [data];
      fixRelationShapes(rows, tableName, mergedInclude);
      applyNestedOpts(rows, tableName, mergedInclude);
      applyCount(rows, opts.include?._count, tableName);
      stripCountOnlyRelations(rows, opts.include, opts.include?._count);

      return rows[0];
    },

    // ----- findUniqueOrThrow -----
    async findUniqueOrThrow(args: any) {
      const result = await this.findUnique(args);
      if (!result) {
        throw new Error(`Record not found in ${tableName}`);
      }
      return result;
    },

    // ----- create -----
    async create(args: any) {
      const { cleanData, nested } = extractNestedCreates(tableName, args.data);

      const mergedInclude = ensureCountRelationsIncluded(args.include, tableName);
      const selectStr = buildSelectString(tableName, { select: args.select, include: mergedInclude });

      const { data, error } = await sb()
        .from(tableName)
        .insert(cleanData)
        .select(selectStr)
        .single();

      if (error) throw new Error(`Supabase create ${tableName}: ${error.message}`);

      // Handle nested creates
      if (nested.length > 0 && data) {
        for (const nc of nested) {
          const childRows = nc.data.map((d: any) => ({ ...d, [nc.fk]: data.id }));
          const { error: childError } = await sb().from(nc.table).insert(childRows);
          if (childError) throw new Error(`Supabase nested create ${nc.table}: ${childError.message}`);
        }

        // Re-fetch with includes to get the nested data
        if (mergedInclude) {
          const refetched = await this.findUnique({ where: { id: data.id }, select: args.select, include: args.include });
          return refetched;
        }
      }

      if (data) {
        const rows = [data];
        fixRelationShapes(rows, tableName, mergedInclude);
        applyNestedOpts(rows, tableName, mergedInclude);
        applyCount(rows, args.include?._count, tableName);
        stripCountOnlyRelations(rows, args.include, args.include?._count);
        return rows[0];
      }

      return data;
    },

    // ----- createMany -----
    async createMany(args: any) {
      const { data: insertData } = args;
      const rows = Array.isArray(insertData) ? insertData : [insertData];

      const { data, error } = await sb()
        .from(tableName)
        .insert(rows)
        .select();

      if (error) throw new Error(`Supabase createMany ${tableName}: ${error.message}`);
      return { count: data?.length || 0 };
    },

    // ----- update -----
    async update(args: any) {
      const mergedInclude = ensureCountRelationsIncluded(args.include, tableName);
      const selectStr = buildSelectString(tableName, { select: args.select, include: mergedInclude });

      let query = sb().from(tableName).update(args.data).select(selectStr);
      query = applyWhere(query, args.where);
      query = query.single();

      const { data, error } = await query;
      if (error) throw new Error(`Supabase update ${tableName}: ${error.message}`);

      if (data) {
        const rows = [data];
        fixRelationShapes(rows, tableName, mergedInclude);
        applyNestedOpts(rows, tableName, mergedInclude);
        applyCount(rows, args.include?._count, tableName);
        stripCountOnlyRelations(rows, args.include, args.include?._count);
        return rows[0];
      }

      return data;
    },

    // ----- updateMany -----
    async updateMany(args: any) {
      let query = sb().from(tableName).update(args.data).select("id");
      query = applyWhere(query, args.where);

      const { data, error } = await query;
      if (error) throw new Error(`Supabase updateMany ${tableName}: ${error.message}`);
      return { count: data?.length || 0 };
    },

    // ----- delete -----
    async delete(args: any) {
      const selectStr = buildSelectString(tableName, { select: args.select, include: args.include });

      let query = sb().from(tableName).delete().select(selectStr);
      query = applyWhere(query, args.where);
      query = query.single();

      const { data, error } = await query;
      if (error) throw new Error(`Supabase delete ${tableName}: ${error.message}`);
      return data;
    },

    // ----- deleteMany -----
    async deleteMany(args?: any) {
      let query = sb().from(tableName).delete().select("id");
      if (args?.where) {
        query = applyWhere(query, args.where);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Supabase deleteMany ${tableName}: ${error.message}`);
      return { count: data?.length || 0 };
    },

    // ----- count -----
    async count(args?: any) {
      let query = sb().from(tableName).select("id", { count: "exact", head: true });
      if (args?.where) {
        query = applyWhere(query, args.where);
      }

      const { count, error } = await query;
      if (error) throw new Error(`Supabase count ${tableName}: ${error.message}`);
      return count || 0;
    },

    // ----- upsert -----
    async upsert(args: any) {
      const { where, create: createData, update: updateData } = args;
      const mergedInclude = ensureCountRelationsIncluded(args.include, tableName);
      const selectStr = buildSelectString(tableName, { select: args.select, include: mergedInclude });

      // Try to find existing
      let findQuery = sb().from(tableName).select("id");
      findQuery = applyWhere(findQuery, where);
      const { data: existing } = await findQuery.maybeSingle();

      if (existing) {
        // Update
        let updateQuery = sb().from(tableName).update(updateData).select(selectStr);
        updateQuery = applyWhere(updateQuery, where);
        const { data, error } = await updateQuery.single();
        if (error) throw new Error(`Supabase upsert(update) ${tableName}: ${error.message}`);

        if (data) {
          const rows = [data];
          fixRelationShapes(rows, tableName, mergedInclude);
          return rows[0];
        }
        return data;
      } else {
        // Insert
        const { data, error } = await sb()
          .from(tableName)
          .insert(createData)
          .select(selectStr)
          .single();
        if (error) throw new Error(`Supabase upsert(create) ${tableName}: ${error.message}`);

        if (data) {
          const rows = [data];
          fixRelationShapes(rows, tableName, mergedInclude);
          return rows[0];
        }
        return data;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// The prisma proxy itself
// ---------------------------------------------------------------------------
function createPrismaProxy() {
  const delegates: Record<string, any> = {};

  // Pre-build delegates for all models
  for (const [camelName, tableName] of Object.entries(MODEL_TABLE_MAP)) {
    delegates[camelName] = createModelDelegate(camelName, tableName);
  }

  const handler: ProxyHandler<any> = {
    get(_target, prop: string) {
      // Model access: prisma.user, prisma.song, etc.
      if (delegates[prop]) return delegates[prop];

      // $transaction — execute an array of promises sequentially
      if (prop === "$transaction") {
        return async (input: any) => {
          if (Array.isArray(input)) {
            // Array of promises (already initiated)
            return Promise.all(input);
          }
          // Interactive transaction callback — just call it with the proxy itself
          if (typeof input === "function") {
            return input(prisma);
          }
          return input;
        };
      }

      // $connect / $disconnect — no-op for REST
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }

      // Allow access to internals without error
      if (prop === "then" || prop === Symbol.toPrimitive as any || prop === "toJSON") {
        return undefined;
      }

      return undefined;
    },
  };

  return new Proxy({}, handler);
}

export const prisma = globalForPrisma.prisma || createPrismaProxy();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
