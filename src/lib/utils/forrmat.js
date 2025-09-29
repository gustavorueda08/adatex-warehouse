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
