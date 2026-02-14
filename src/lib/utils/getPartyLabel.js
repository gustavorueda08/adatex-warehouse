export const getPartyLabel = (party) => {
  if (!party) return "";

  const name = party.name || "";
  const lastName = party.lastName || "";

  return `${name} ${lastName}`.trim();
};
