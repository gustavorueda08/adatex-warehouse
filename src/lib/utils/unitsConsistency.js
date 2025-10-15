export default function unitsAreConsistent(products = []) {
  console.log("PRODUCTOS", products);

  if (products.length === 0) return false;
  const firstQuantityUnit = products[0].unit;
  // Verifica que cada item tenga el mismo quantityUnit que el primer item
  return products.every((product) => product.unit === firstQuantityUnit);
}
