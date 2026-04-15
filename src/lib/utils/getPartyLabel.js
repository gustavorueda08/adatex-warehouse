export const getPartyLabel = (party) => {
  if (!party) return "";

  const name = party.name || "";
  const lastName = party.lastName || "";
  const fullName = `${name} ${lastName}`.trim();

  if (party.companyName) {
    return fullName ? `${party.companyName} (${fullName})` : party.companyName;
  }

  return fullName;
};
