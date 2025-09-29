export default function unitsAreConsistent(items = []) {
  if (items.length === 0) return false;
  const firstQuantityUnit = items[0].unit;
  // Verifica que cada item tenga el mismo quantityUnit que el primer item
  return items.every((item) => item.unit === firstQuantityUnit);
}
