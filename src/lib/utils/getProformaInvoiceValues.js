import { v4 } from "uuid";

const orderTaxArray = (array = []) => {
  const ordenPrioridad = ["IVA - 19%", "Retefuente -2,5%", "ICA - 0,77%"];

  return array.sort((a, b) => {
    const indexA = ordenPrioridad.indexOf(a.name);
    const indexB = ordenPrioridad.indexOf(b.name);

    // Si ambos están en la lista de prioridad, ordenar por su posición
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // Si solo A está en la lista de prioridad, A va primero
    if (indexA !== -1) {
      return -1;
    }

    // Si solo B está en la lista de prioridad, B va primero
    if (indexB !== -1) {
      return 1;
    }

    // Si ninguno está en la lista de prioridad, mantener orden original
    return 0;
  });
};

export function getProformaInvoiceResume(products = [], taxes = []) {
  const subtotalTaxes = taxes.filter(
    (tax) => tax.applicationType === "subtotal"
  );
  let subtotalForTaxes = 0;
  let subtotalWithNoTaxes = 0;
  products
    .filter((product) => product.product && product.quantity !== "")
    .forEach((product) => {
      console.log(product);

      const invoicePercentage = Number(product.invoicePercentage) / 100;
      console.log(invoicePercentage);

      const price = product.ivaIncluded ? product.price / 1.19 : product.price;
      const quantity = product.items.reduce(
        (acc, item) => acc + item.quantity,
        0
      );
      const quantityForTaxes =
        Math.round(quantity * invoicePercentage * 100) / 100;
      const quantityWithNoTaxes =
        Math.round((quantity - quantityForTaxes) * 100) / 100;
      console.log(quantityForTaxes, quantityWithNoTaxes, price);

      subtotalForTaxes += price * quantityForTaxes;
      subtotalWithNoTaxes += price * quantityWithNoTaxes;
    });
  const subtotal = subtotalForTaxes + subtotalWithNoTaxes;
  const taxesValues = orderTaxArray(
    subtotalTaxes.map((tax) => ({
      id: tax.id,
      name: tax.name,
      use: tax.use,
      amount:
        subtotalForTaxes >= tax.treshold ? subtotalForTaxes * tax.amount : 0,
    }))
  );
  const taxAmount = taxesValues.reduce(
    (acc, tax) =>
      tax.use === "increment" ? acc + tax.amount : acc - tax.amount,
    0
  );
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    taxes: taxesValues.map((tax) => ({
      ...tax,
      amount: Math.round(tax.amount * 100) / 100,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    total,
  };
}

export function convertProformaInvoiceResumeToArray(
  data = { taxes: [], subtotal: 0, total: 0 }
) {
  return [
    {
      id: v4(),
      name: "Subtotal",
      amount: data.subtotal,
    },
    ...data.taxes,
    {
      id: `total-${v4()}`,
      name: "Total",
      amount: data.total,
    },
  ];
}

export function getPIResumeForResumeTable(products = [], taxes = []) {
  return convertProformaInvoiceResumeToArray(
    getProformaInvoiceResume(products, taxes)
  );
}
