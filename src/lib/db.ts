import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Singleton client — reuse across hot-reloads in dev
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { _sb?: SupabaseClient };

function sb(): SupabaseClient {
  if (!g._sb) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    g._sb = createClient(url, key, { auth: { persistSession: false } });
  }
  return g._sb;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fail(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? "Database error";
  throw new Error(msg);
}

function toIso(v: unknown): unknown {
  return v instanceof Date ? v.toISOString() : v;
}

function newId(): string {
  return crypto.randomUUID();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;
type OrderInput = AnyObj | AnyObj[];
type WhereInput = AnyObj;
type SelectInput = Record<string, boolean>;

function buildSelect(sel?: SelectInput): string {
  if (!sel) return "*";
  const fields = Object.entries(sel)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return fields.length ? fields.join(", ") : "*";
}

function applyWhere(q: ReturnType<SupabaseClient["from"]>, where: WhereInput) {
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (v === null) { q = (q as any).is(k, null); continue; }
    if (v instanceof Date) { q = (q as any).eq(k, v.toISOString()); continue; }
    if (typeof v === "object" && !Array.isArray(v)) {
      const c = v as AnyObj;
      if ("contains" in c)      q = (q as any).ilike(k, `%${c.contains}%`);
      else if ("equals" in c)   q = (q as any).eq(k, c.equals);
      else if ("in" in c)       q = (q as any).in(k, c.in as unknown[]);
      else if ("not" in c)      q = (q as any).neq(k, c.not);
      else if ("gte" in c && "lt" in c)
        q = (q as any).gte(k, toIso(c.gte)).lt(k, toIso(c.lt));
      else if ("gte" in c && "lte" in c)
        q = (q as any).gte(k, toIso(c.gte)).lte(k, toIso(c.lte));
      else if ("gte" in c)      q = (q as any).gte(k, toIso(c.gte));
      else if ("gt" in c)       q = (q as any).gt(k, toIso(c.gt));
      else if ("lte" in c)      q = (q as any).lte(k, toIso(c.lte));
      else if ("lt" in c)       q = (q as any).lt(k, toIso(c.lt));
    } else {
      q = (q as any).eq(k, v);
    }
  }
  return q;
}

function applyOrder(q: any, orderBy?: OrderInput): any {
  if (!orderBy) return q;
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const ob of arr) {
    for (const [col, dir] of Object.entries(ob as AnyObj)) {
      q = q.order(col, { ascending: dir === "asc" });
    }
  }
  return q;
}

// ---------------------------------------------------------------------------
// Relation map:  model → { relationName → { table, fk, many, localKey? } }
// fk    = the foreign-key column in the *related* table  (for one-to-many)
// localKey = the FK column in *this* table               (for many-to-one)
// ---------------------------------------------------------------------------
type RelDef = { table: string; fk: string; many: boolean; localKey?: string };
const RELS: Record<string, Record<string, RelDef>> = {
  Song: {
    arrangements:  { table: "SongArrangement", fk: "songId",        many: true },
    serviceItems:  { table: "ServiceItem",      fk: "songId",        many: true },
    usageLogs:     { table: "SongUsageLog",     fk: "songId",        many: true },
  },
  SongArrangement: {
    song:          { table: "Song",         fk: "id",   localKey: "songId",         many: false },
    serviceItems:  { table: "ServiceItem",  fk: "arrangementId",                   many: true  },
  },
  Service: {
    items:         { table: "ServiceItem",      fk: "serviceId",     many: true  },
    assignments:   { table: "TeamAssignment",   fk: "serviceId",     many: true  },
    template:      { table: "ServiceTemplate",  fk: "id", localKey: "templateId", many: false },
  },
  ServiceItem: {
    service:       { table: "Service",          fk: "id", localKey: "serviceId",  many: false },
    song:          { table: "Song",             fk: "id", localKey: "songId",     many: false },
    arrangement:   { table: "SongArrangement",  fk: "id", localKey: "arrangementId", many: false },
    assignee:      { table: "User",             fk: "id", localKey: "assigneeId", many: false },
  },
  TeamAssignment: {
    service:       { table: "Service", fk: "id", localKey: "serviceId", many: false },
    user:          { table: "User",    fk: "id", localKey: "userId",    many: false },
  },
  Availability: {
    user:          { table: "User", fk: "id", localKey: "userId", many: false },
  },
  Notification: {
    user:          { table: "User", fk: "id", localKey: "userId", many: false },
  },
  SongUsageLog: {
    song:          { table: "Song", fk: "id", localKey: "songId", many: false },
  },
  User: {
    assignments:   { table: "TeamAssignment", fk: "userId",    many: true },
    availability:  { table: "Availability",   fk: "userId",    many: true },
    notifications: { table: "Notification",   fk: "userId",    many: true },
    assignedItems: { table: "ServiceItem",    fk: "assigneeId", many: true },
    joinRequests:  { table: "JoinRequest",    fk: "userId",    many: true },
    messages:      { table: "JoinRequestMessage", fk: "senderId", many: true },
  },
  Church: {
    members:       { table: "User",          fk: "churchId",  many: true },
    joinRequests:  { table: "JoinRequest",   fk: "churchId",  many: true },
    services:      { table: "Service",       fk: "churchId",  many: true },
    announcements: { table: "Announcement",  fk: "churchId",  many: true },
    networks:      { table: "NetworkChurch", fk: "churchId",  many: true },
  },
  Network: {
    churches: { table: "NetworkChurch", fk: "networkId", many: true },
  },
  NetworkChurch: {
    network: { table: "Network", fk: "id", localKey: "networkId", many: false },
    church:  { table: "Church",  fk: "id", localKey: "churchId",  many: false },
  },
  Announcement: {
    church: { table: "Church", fk: "id", localKey: "churchId", many: false },
    author: { table: "User",   fk: "id", localKey: "authorId", many: false },
  },
  GuestInvitation: {
    service:     { table: "Service", fk: "id", localKey: "serviceId",    many: false },
    guestUser:   { table: "User",    fk: "id", localKey: "guestUserId",  many: false },
    hostChurch:  { table: "Church",  fk: "id", localKey: "hostChurchId", many: false },
  },
  JoinRequest: {
    church:   { table: "Church", fk: "id", localKey: "churchId", many: false },
    user:     { table: "User",   fk: "id", localKey: "userId",   many: false },
    messages: { table: "JoinRequestMessage", fk: "joinRequestId", many: true },
  },
  JoinRequestMessage: {
    joinRequest: { table: "JoinRequest", fk: "id", localKey: "joinRequestId", many: false },
    sender:      { table: "User",        fk: "id", localKey: "senderId",      many: false },
  },
};

// ---------------------------------------------------------------------------
// Helpers for nested orderBy
// ---------------------------------------------------------------------------
function isSimpleOrder(ob: OrderInput | undefined): boolean {
  if (!ob) return true;
  const arr = Array.isArray(ob) ? ob : [ob];
  return arr.every((o) =>
    Object.values(o as AnyObj).every((v) => v === "asc" || v === "desc")
  );
}

function sortByNested(rows: AnyObj[], orderBy: OrderInput): AnyObj[] {
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const ob of arr as AnyObj[]) {
      for (const [field, val] of Object.entries(ob)) {
        if (typeof val === "object" && val !== null) {
          // e.g. { service: { date: "desc" } }
          const [subField, subDir] = Object.entries(val as AnyObj)[0] as [string, string];
          const av = (a[field] as AnyObj)?.[subField] ?? "";
          const bv = (b[field] as AnyObj)?.[subField] ?? "";
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          if (cmp !== 0) return subDir === "asc" ? cmp : -cmp;
        }
      }
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// resolveIncludes — attaches related records onto each row
// ---------------------------------------------------------------------------
async function resolveIncludes(
  rows: AnyObj[],
  tableName: string,
  include: AnyObj
): Promise<AnyObj[]> {
  if (!rows.length) return rows;
  const relMap = RELS[tableName] ?? {};

  for (const [relName, relCfg] of Object.entries(include)) {
    if (relName === "_count") continue;
    const rel = relMap[relName];
    if (!rel) continue;

    const nested = relCfg !== true && typeof relCfg === "object" ? (relCfg as AnyObj) : null;
    const nestedInclude = nested?.include as AnyObj | undefined;
    const nestedSelect  = nested?.select  as SelectInput | undefined;
    const nestedOrder   = nested?.orderBy as OrderInput  | undefined;
    const nestedTake    = nested?.take    as number | undefined;

    if (rel.many) {
      const ids = [...new Set(rows.map((r) => r.id as string).filter(Boolean))];
      let q = sb().from(rel.table).select(buildSelect(nestedSelect)).in(rel.fk, ids);

      // Only apply DB-level ordering for simple column sorts (not nested relation sorts)
      if (nestedOrder && isSimpleOrder(nestedOrder)) q = applyOrder(q, nestedOrder);

      const { data, error } = await q;
      if (error) fail(error);

      let relRows = (data ?? []) as AnyObj[];
      if (nestedInclude) relRows = await resolveIncludes(relRows, rel.table, nestedInclude);

      // Sort in JS when orderBy references a nested relation (e.g. { service: { date: "desc" } })
      if (nestedOrder && !isSimpleOrder(nestedOrder)) relRows = sortByNested(relRows, nestedOrder);

      const grouped = new Map<string, AnyObj[]>();
      for (const r of relRows) {
        const k = r[rel.fk] as string;
        if (!grouped.has(k)) grouped.set(k, []);
        const arr = grouped.get(k)!;
        if (!nestedTake || arr.length < nestedTake) arr.push(r);
      }
      for (const row of rows) row[relName] = grouped.get(row.id as string) ?? [];
    } else {
      const localKey = rel.localKey!;
      const ids = [...new Set(rows.map((r) => r[localKey] as string).filter(Boolean))];
      if (!ids.length) { rows.forEach((r) => (r[relName] = null)); continue; }

      let q = sb().from(rel.table).select(buildSelect(nestedSelect)).in("id", ids);
      const { data, error } = await q;
      if (error) fail(error);

      let relRows = (data ?? []) as AnyObj[];
      if (nestedInclude) relRows = await resolveIncludes(relRows, rel.table, nestedInclude);

      const byId = new Map(relRows.map((r) => [r.id as string, r]));
      for (const row of rows) row[relName] = byId.get(row[localKey] as string) ?? null;
    }
  }

  // _count — uses already-fetched arrays when available, otherwise batches one query per field
  if ("_count" in include) {
    const countFields = ((include._count as AnyObj).select ?? {}) as Record<string, boolean>;
    for (const [field, wanted] of Object.entries(countFields)) {
      if (!wanted) continue;
      const rel = relMap[field];
      if (!rel?.many) continue;

      const needsFetch = rows.some((r) => !Array.isArray(r[field]));
      if (needsFetch) {
        const ids = rows.map((r) => r.id as string);
        const { data, error } = await sb()
          .from(rel.table)
          .select(rel.fk)
          .in(rel.fk, ids);
        if (error) fail(error);
        const counts = new Map<string, number>();
        for (const r of (data ?? []) as AnyObj[]) {
          const k = r[rel.fk] as string;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        for (const row of rows) {
          if (!row._count) row._count = {};
          (row._count as AnyObj)[field] = counts.get(row.id as string) ?? 0;
        }
      } else {
        for (const row of rows) {
          if (!row._count) row._count = {};
          (row._count as AnyObj)[field] = (row[field] as unknown[]).length;
        }
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Flatten a Prisma-style where that may contain compound keys
// e.g. { userId_date: { userId, date } }  →  { userId, date }
// ---------------------------------------------------------------------------
function flattenWhere(where: WhereInput): WhereInput {
  const out: WhereInput = {};
  for (const [k, v] of Object.entries(where)) {
    if (
      typeof v === "object" &&
      v !== null &&
      !(v instanceof Date) &&
      !Array.isArray(v) &&
      !("contains" in (v as AnyObj)) &&
      !("gte" in (v as AnyObj)) &&
      !("gt" in (v as AnyObj)) &&
      !("lte" in (v as AnyObj)) &&
      !("lt" in (v as AnyObj)) &&
      !("equals" in (v as AnyObj)) &&
      !("in" in (v as AnyObj)) &&
      !("not" in (v as AnyObj))
    ) {
      Object.assign(out, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prepare data for INSERT/UPDATE: drop undefined, convert Dates, skip nested creates
// ---------------------------------------------------------------------------
function flatData(
  data: AnyObj,
  nestedOut?: Record<string, { create: AnyObj[] }>
): AnyObj {
  const out: AnyObj = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date) && "create" in (v as AnyObj)) {
      if (nestedOut) nestedOut[k] = v as { create: AnyObj[] };
      continue;
    }
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// model() — returns a Prisma-like object for one table
// All methods return any/any[] so callers keep their existing property access.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
function model(tableName: string): {
  findMany(args?: any): Promise<any[]>;
  findUnique(args: any): Promise<any | null>;
  findFirst(args?: any): Promise<any | null>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<{ count: number }>;
  delete(args: any): Promise<any>;
  deleteMany(args?: any): Promise<{ count: number }>;
  upsert(args: any): Promise<any>;
  count(args?: any): Promise<number>;
  aggregate(args: any): Promise<any>;
  findUniqueOrThrow(args: any): Promise<any>;
  findFirstOrThrow(args?: any): Promise<any>;
  createMany(args: any): Promise<{ count: number }>;
} {
  return {
    async findMany({
      where, include, select, orderBy, skip, take,
    }: {
      where?: WhereInput; include?: AnyObj; select?: SelectInput;
      orderBy?: OrderInput; skip?: number; take?: number;
    } = {}): Promise<AnyObj[]> {
      let q: any = sb().from(tableName).select(include ? "*" : buildSelect(select));

      if (where) {
        if (Array.isArray(where.OR)) {
          const orStr = (where.OR as WhereInput[])
            .flatMap((cond) =>
              Object.entries(cond).map(([k, v]) => {
                if (typeof v === "object" && v !== null && "contains" in (v as AnyObj))
                  return `${k}.ilike.%${(v as AnyObj).contains}%`;
                return `${k}.eq.${toIso(v)}`;
              })
            )
            .join(",");
          q = q.or(orStr);
          const rest = { ...where };
          delete rest.OR;
          q = applyWhere(q, rest);
        } else {
          q = applyWhere(q, where);
        }
      }

      q = applyOrder(q, orderBy);
      if (skip !== undefined) q = q.range(skip, skip + (take ?? 1000) - 1);
      else if (take !== undefined) q = q.limit(take);

      const { data, error } = await q;
      if (error) fail(error);

      let rows = (data ?? []) as AnyObj[];
      if (include) rows = await resolveIncludes(rows, tableName, include);
      return rows;
    },

    async findUnique({
      where, include, select,
    }: {
      where: WhereInput; include?: AnyObj; select?: SelectInput;
    }): Promise<AnyObj | null> {
      let q: any = sb().from(tableName).select(include ? "*" : buildSelect(select));
      q = applyWhere(q, flattenWhere(where));
      q = q.limit(1);

      const { data, error } = await q;
      if (error) fail(error);

      let row = (data as AnyObj[])[0] ?? null;
      if (!row) return null;
      if (include) [row] = await resolveIncludes([row], tableName, include);
      return row;
    },

    async findFirst({
      where, include, select, orderBy,
    }: {
      where?: WhereInput; include?: AnyObj; select?: SelectInput; orderBy?: OrderInput;
    } = {}): Promise<AnyObj | null> {
      let q: any = sb().from(tableName).select(include ? "*" : buildSelect(select));
      if (where) q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      q = q.limit(1);

      const { data, error } = await q;
      if (error) fail(error);

      let row = (data as AnyObj[])[0] ?? null;
      if (!row) return null;
      if (include) [row] = await resolveIncludes([row], tableName, include);
      return row;
    },

    async create({
      data, include, select,
    }: {
      data: AnyObj; include?: AnyObj; select?: SelectInput;
    }): Promise<AnyObj> {
      const nested: Record<string, { create: AnyObj[] }> = {};
      const flat = flatData(data, nested);
      if (!flat.id) flat.id = newId();

      const { data: ins, error } = await sb()
        .from(tableName)
        .insert(flat)
        .select(include ? "*" : buildSelect(select))
        .single();
      if (error) fail(error);

      let row = ins as AnyObj;

      // Handle nested creates (e.g. service.create with items: { create: [...] })
      const relMap = RELS[tableName] ?? {};
      for (const [relName, relData] of Object.entries(nested)) {
        const rel = relMap[relName];
        if (!rel?.many) continue;
        const childRows = relData.create.map((item) => {
          const child = flatData(item);
          if (!child.id) child.id = newId();
          child[rel.fk] = row.id;
          return child;
        });
        const { error: ce } = await sb().from(rel.table).insert(childRows);
        if (ce) fail(ce);
      }

      if (include) [row] = await resolveIncludes([row], tableName, include);
      return row;
    },

    async update({
      where, data, include, select,
    }: {
      where: WhereInput; data: AnyObj; include?: AnyObj; select?: SelectInput;
    }): Promise<AnyObj> {
      const flat = flatData(data);
      flat.updatedAt = new Date().toISOString();

      let q: any = sb()
        .from(tableName)
        .update(flat)
        .select(include ? "*" : buildSelect(select));
      q = applyWhere(q, flattenWhere(where));

      const { data: rows, error } = await q;
      if (error) fail(error);

      let row = (rows as AnyObj[])[0];
      if (!row) fail({ message: `${tableName} not found` });
      if (include) [row] = await resolveIncludes([row], tableName, include);
      return row;
    },

    async updateMany({
      where, data,
    }: {
      where?: WhereInput; data: AnyObj;
    }): Promise<{ count: number }> {
      const flat = flatData(data);
      flat.updatedAt = new Date().toISOString();

      let q: any = sb().from(tableName).update(flat).select("id");
      if (where) q = applyWhere(q, where);

      const { data: rows, error } = await q;
      if (error) fail(error);
      return { count: (rows as unknown[]).length };
    },

    async delete({ where }: { where: WhereInput }): Promise<AnyObj> {
      let q: any = sb().from(tableName).delete().select("*");
      q = applyWhere(q, flattenWhere(where));

      const { data, error } = await q;
      if (error) fail(error);
      return ((data as AnyObj[])[0]) ?? {};
    },

    async deleteMany({ where }: { where?: WhereInput } = {}): Promise<{ count: number }> {
      let q: any = sb().from(tableName).delete().select("id");
      if (where) q = applyWhere(q, where);

      const { data, error } = await q;
      if (error) fail(error);
      return { count: (data as unknown[]).length };
    },

    async upsert({
      where, create, update, include, select,
    }: {
      where: WhereInput; create: AnyObj; update: AnyObj;
      include?: AnyObj; select?: SelectInput;
    }): Promise<AnyObj> {
      const flatWhere = flattenWhere(where);
      const conflictCols = Object.keys(flatWhere).join(",");

      const upsertRow: AnyObj = {
        ...Object.fromEntries(Object.entries(create).map(([k, v]) => [k, toIso(v)])),
        ...Object.fromEntries(Object.entries(update).map(([k, v]) => [k, toIso(v)])),
      };
      if (!upsertRow.id) upsertRow.id = newId();
      upsertRow.updatedAt = new Date().toISOString();

      const { data, error } = await sb()
        .from(tableName)
        .upsert(upsertRow, { onConflict: conflictCols })
        .select(include ? "*" : buildSelect(select));
      if (error) fail(error);

      let row = (data as AnyObj[])[0];
      if (include) [row] = await resolveIncludes([row], tableName, include);
      return row;
    },

    async count({ where }: { where?: WhereInput } = {}): Promise<number> {
      let q: any = sb().from(tableName).select("*", { count: "exact", head: true });
      if (where) q = applyWhere(q, where);

      const { count, error } = await q;
      if (error) fail(error);
      return count ?? 0;
    },

    async createMany({ data }: { data: AnyObj[] }): Promise<{ count: number }> {
      const rows = data.map((d) => { const f = flatData(d); if (!f.id) f.id = newId(); return f; });
      const { data: ins, error } = await sb().from(tableName).insert(rows).select("id");
      if (error) fail(error);
      return { count: (ins ?? []).length };
    },

    async findUniqueOrThrow(args: any): Promise<any> {
      const row = await this.findUnique(args);
      if (!row) fail({ message: `${tableName} not found` });
      return row;
    },

    async findFirstOrThrow(args?: any): Promise<any> {
      const row = await this.findFirst(args);
      if (!row) fail({ message: `${tableName} not found` });
      return row;
    },

    async aggregate({
      where, _max, _min, _sum,
    }: {
      where?: WhereInput;
      _max?: Record<string, boolean>;
      _min?: Record<string, boolean>;
      _sum?: Record<string, boolean>;
    }): Promise<AnyObj> {
      const fields = [
        ...Object.keys(_max ?? {}),
        ...Object.keys(_min ?? {}),
        ...Object.keys(_sum ?? {}),
      ];

      let q: any = sb().from(tableName).select(fields.join(", ") || "*");
      if (where) q = applyWhere(q, where);

      const { data, error } = await q;
      if (error) fail(error);
      const rows = (data ?? []) as AnyObj[];

      const result: AnyObj = {};

      if (_max) {
        result._max = {};
        for (const f of Object.keys(_max)) {
          (result._max as AnyObj)[f] = rows.length
            ? rows.reduce<number | null>(
                (m, r) => (r[f] as number) > (m ?? -Infinity) ? r[f] as number : m,
                null
              )
            : null;
        }
      }
      if (_min) {
        result._min = {};
        for (const f of Object.keys(_min)) {
          (result._min as AnyObj)[f] = rows.length
            ? rows.reduce<number | null>(
                (m, r) => (r[f] as number) < (m ?? Infinity) ? r[f] as number : m,
                null
              )
            : null;
        }
      }
      if (_sum) {
        result._sum = {};
        for (const f of Object.keys(_sum)) {
          (result._sum as AnyObj)[f] = rows.reduce((s, r) => s + (r[f] as number ?? 0), 0);
        }
      }

      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Exported prisma-compatible client
// ---------------------------------------------------------------------------
export const prisma = {
  user:            model("User"),
  song:            model("Song"),
  songArrangement: model("SongArrangement"),
  songUsageLog:    model("SongUsageLog"),
  service:         model("Service"),
  serviceItem:     model("ServiceItem"),
  serviceTemplate: model("ServiceTemplate"),
  teamAssignment:  model("TeamAssignment"),
  availability:    model("Availability"),
  notification:    model("Notification"),
  appSettings:     model("AppSettings"),
  ppDevice:           model("PPDevice"),
  pPDevice:           model("PPDevice"),
  ppCommand:          model("PPCommand"),
  church:             model("Church"),
  serviceRole:        model("ServiceRole"),
  joinRequest:        model("JoinRequest"),
  joinRequestMessage: model("JoinRequestMessage"),
  network:            model("Network"),
  networkChurch:      model("NetworkChurch"),
  announcement:       model("Announcement"),
  guestInvitation:    model("GuestInvitation"),

  // Sequential (not truly atomic) — acceptable for this app's scale
  $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
};
