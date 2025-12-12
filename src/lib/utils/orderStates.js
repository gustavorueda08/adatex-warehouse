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
    variant: "",
  };
  switch (state) {
    case ORDER_STATES.DRAFT:
      data.label = "Pendiente";
      data.variant = "yellow";
      break;
    case ORDER_STATES.CONFIRMED:
      data.label = "Confirmada";
      data.variant = "cyan";
      break;
    case ORDER_STATES.PROCESSING:
      data.label = "Procesando";
      data.variant = "yellow";
      break;
    case ORDER_STATES.COMPLETED:
      data.label = "Completada";
      data.variant = "emerald";
      break;
    case ORDER_STATES.CANCELLED:
      data.label = "Cancelada";
      data.variant = "red";
      break;
    case ORDER_STATES.PENDING:
      data.label = "Pendiente";
      data.variant = "yellow";
      break;
    default:
      break;
  }
  return data;
});

export const getOrderStateDataFromState = (state) =>
  orderStatesArray.find((data) => data.key === state) || {
    key: "error",
    label: "Error",
    variant: "red",
  };
