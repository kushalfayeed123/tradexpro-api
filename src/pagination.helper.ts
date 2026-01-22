export function getPaginationRange(page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}
