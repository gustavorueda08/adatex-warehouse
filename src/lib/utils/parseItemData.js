export function parseItemData(input) {
  if (!input || input === "") {
    return { barcode: null, quantity: null };
  }

  const cleanInput = String(input).trim();

  // Si tiene 16+ caracteres, es un barcode
  if (cleanInput.length >= 16) {
    return { barcode: cleanInput, quantity: null };
  }

  // Para strings cortos, verificar si es numérico
  const normalizedInput = cleanInput.replace(",", ".");
  const asNumber = Number(normalizedInput);

  const isQuantity =
    !isNaN(asNumber) &&
    isFinite(asNumber) &&
    /^-?\d+([.,]\d+)?$/.test(cleanInput);

  if (isQuantity) {
    return { barcode: null, quantity: asNumber };
  } else {
    return { barcode: cleanInput, quantity: null };
  }
}
