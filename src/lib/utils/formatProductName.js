export default function formatProductName(str) {
  // pasamos todo a minúsculas primero
  str = str.toLowerCase();

  // primera letra del string en mayúscula
  str = str.charAt(0).toUpperCase() + str.slice(1);

  // primera letra después del "/" en mayúscula
  str = str.replace(/\/\s*\w/, (match) => {
    return match.toUpperCase();
  });

  return str;
}
