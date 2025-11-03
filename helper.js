// helpers

// PROBAR EN POSTMAN O THUNDERBOLT LOS PARAMS DE QUERY PARA TABLAS SERVER SIDE
function pushKV(out, k, v) {
  if (v === undefined || v === null || v === "") return;
  out.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
}
function isPlainObject(x) { return typeof x === "object" && x !== null && !Array.isArray(x); }
function isRangeDate(v) { return isPlainObject(v) && ("from" in v || "to" in v); }

/**
 * Devuelve { query: 'page=1&perPage=10&filters[name]=Cesa&filters[createdAt][from]=2025-01-01&...' }
 */
const buildParams = ({
  page,
  perPage,
  sortBy,
  sortDir,
  search,
  filters,
  extraParams = {},
}) => {
  const parts = [];

  // base
  pushKV(parts, "page", page);
  pushKV(parts, "perPage", perPage);
  if (sortBy)  pushKV(parts, "sortBy", sortBy);
  if (sortDir) pushKV(parts, "sortDir", sortDir);
  if (search)  pushKV(parts, "search", search);

  // extra params sueltos (k=v)
  Object.entries(extraParams).forEach(([k, v]) => pushKV(parts, k, v));

  // filtros => filters[name]=...  y   filters[date][from]=...
  Object.entries(filters ?? {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;

    const baseKey = `filters[${k}]`;

    if (isRangeDate(v)) {
      if (v.from) pushKV(parts, `${baseKey}[from]`, v.from);
      if (v.to)   pushKV(parts, `${baseKey}[to]`, v.to);
      return;
    }

    if (Array.isArray(v)) {
      v.forEach(item => pushKV(parts, baseKey, item));
      return;
    }

    if (isPlainObject(v)) {
      Object.entries(v).forEach(([subK, subV]) => {
        if (subV === undefined || subV === null || subV === "") return;
        pushKV(parts, `${baseKey}[${subK}]`, subV);
      });
      return;
    }

    pushKV(parts, baseKey, v);
  });

  // único parámetro
  const inner = parts.join("&");
  return { query: inner };
};

// DEPENDE DEL MODELO QUE USE SUS FILTERS
const params = buildParams({
  page: 1,
  perPage: 10,
  sortBy: "",          // se omite si vacío
  sortDir: "asc",
  search: "",          // se omite si vacío
  filters: {
    name: "Supe",
    createdAt: { from: "2025-01-01", to: "2025-12-31" },
    status:true
  },
  extraParams: { foo: "bar" }, // opcional
});