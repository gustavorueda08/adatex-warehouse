export const getBadgeVariant = (document) => {
  const state = document?.state;
  if (state === "completed") {
    if (
      document?.type === "sale" &&
      (document?.siigoIdTypeA || document?.siigoIdTypeB)
    ) {
      return "purple";
    }
    return "emerald";
  }
  if (state === "confirmed") return "cyan";
  if (state === "draft") return "yellow";
  if (state === "canceled") return "red";
  return "zinc";
};
