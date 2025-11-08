export default function format(number, symbol = null) {
  let formatedNumber = Number(number).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (symbol) {
    formatedNumber = `${symbol} ${formatedNumber}`;
  }

  if (formatedNumber === "NaN") return "";

  return formatedNumber || "";
}

/**
 * Redondea un número a 2 decimales y lo formatea
 * @param {number} number - Número a redondear
 * @returns {string} Número formateado
 */
format.roundNumber = function roundNumber(number) {
  const rounded = Math.round(Number(number) * 100) / 100;
  return Number(rounded).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
