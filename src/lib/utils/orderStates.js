const ORDER_STATES = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const orderStatesArray = Object.values(ORDER_STATES).map((state) => {
  const data = {
    key: state,
    label: "",
  };
  switch (state) {
    case ORDER_STATES.DRAFT:
      data.label = "Borrador";
      break;
    case ORDER_STATES.CONFIRMED:
      data.label = "Confirmada";
      break;
    case ORDER_STATES.PROCESSING:
      data.label = "Procesando";
      break;
    case ORDER_STATES.COMPLETED:
      data.label = "Completada";
      break;
    case ORDER_STATES.CANCELLED:
      data.label = "Cancelada";
      break;
    case ORDER_STATES.PENDING:
      data.label = "Pendiente";
      break;
    default:
      break;
  }
  return data;
});
