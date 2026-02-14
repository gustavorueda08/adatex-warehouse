export const getChipVariant = (document) => {
  console.log(document.state);

  const state = document?.state;
  if (state === "completed") {
    if (
      document?.type === "sale" &&
      (document?.siigoIdTypeA || document?.siigoIdTypeB)
    ) {
      return "secondary";
    }
    return "success";
  }
  if (state === "confirmed") return "primary";
  if (state === "draft" || state === "pending") return "warning";
  if (state === "canceled") return "danger";
  return "default";
};
