export const ORDER_STATES = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PENDING: "pending",
};

export const orderStatesArray = Object.values(ORDER_STATES).map((state) => {
  const data = {
    key: state,
    label: "",
    miniLabel: "",
    variant: "",
  };
  switch (state) {
    case ORDER_STATES.DRAFT:
      data.label = "Pendiente";
      data.miniLabel = "Pend.";
      data.variant = "yellow";
      break;
    case ORDER_STATES.CONFIRMED:
      data.label = "Confirmada";
      data.miniLabel = "Conf.";
      data.variant = "cyan";
      break;
    case ORDER_STATES.PROCESSING:
      data.label = "Procesando";
      data.miniLabel = "Pro.";
      data.variant = "yellow";
      break;
    case ORDER_STATES.COMPLETED:
      data.label = "Completada";
      data.miniLabel = "Comp.";
      data.variant = "emerald";
      break;
    case ORDER_STATES.CANCELLED:
      data.label = "Cancelada";
      data.miniLabel = "Can.";
      data.variant = "red";
      break;
    case ORDER_STATES.PENDING:
      data.label = "Pendiente";
      data.miniLabel = "P";
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
