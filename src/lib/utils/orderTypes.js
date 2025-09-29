export const ORDER_TYPES = {
  PURCHASE: "purchase",
  SALE: "sale",
  IN: "in",
  OUT: "out",
  RETURN: "return",
  CUT: "cut",
};

export const orderTypesArray = Object.values(ORDER_TYPES).map((type) => {
  const data = {
    key: type,
    label: "",
  };
  switch (type) {
    case ORDER_TYPES.PURCHASE:
      data.label = "Compra";
      break;
    case ORDER_TYPES.IN:
      data.label = "Entrada";
      break;
    case ORDER_TYPES.RETURN:
      data.label = "Devolución";
      break;
    case ORDER_TYPES.SALE:
      data.label = "Venta";
      break;
    case ORDER_TYPES.OUT:
      data.label = "Salida";
      break;
    case ORDER_TYPES.CUT:
      data.label = "Corte";
      break;
    default:
      break;
  }

  return data;
});
