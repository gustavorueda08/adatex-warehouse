"use client";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import format from "./format";
import unitsAreConsistent from "./unitsConsistency";

export function createProductColumnsForm({
  updateProductField,
  handleProductSelect,
  getAvailableProductsForRow,
  user,
  productsData = [],
  includePrice = true,
  includeIVA = false,
  includeInvoicePercentage = false,
  currency = "$",
  productSelectProps = {},
}) {
  const {
    onSearchProducts,
    productsSearchTerm,
    onLoadMoreProducts,
    productsHasMore,
    productsLoading,
    productsLoadingMore,
  } = productSelectProps;

  const columns = [
    {
      key: "name",
      label: "Producto",
      render: (name, row, index) => {
        const currentProduct = row.product;
        const availableProducts = getAvailableProductsForRow(
          index,
          productsData
        );
        const selectOptions = currentProduct
          ? [
              { label: currentProduct.name, value: currentProduct },
              ...availableProducts
                .filter((p) => p.id !== currentProduct.id)
                .map((p) => ({ label: p.name, value: p })),
            ]
          : availableProducts.map((p) => ({ label: p.name, value: p }));

        return (
          <>
            {/* Select para móvil */}
            <div className="md:hidden">
              <Select
                size="sm"
                options={selectOptions}
                value={currentProduct || null}
                onChange={(selectedProduct) =>
                  handleProductSelect(selectedProduct, index)
                }
                searchable
                onSearch={onSearchProducts}
                searchValue={productsSearchTerm}
                hasMore={productsHasMore}
                onLoadMore={onLoadMoreProducts}
                loading={productsLoading}
                loadingMore={productsLoadingMore}
              />
            </div>

            {/* Select para desktop */}
            <div className="hidden md:block">
              <Select
                className="md:min-w-80"
                size="md"
                options={selectOptions}
                value={currentProduct || null}
                onChange={(selectedProduct) =>
                  handleProductSelect(selectedProduct, index)
                }
                searchable
                onSearch={onSearchProducts}
                searchValue={productsSearchTerm}
                hasMore={productsHasMore}
                onLoadMore={onLoadMoreProducts}
                loading={productsLoading}
                loadingMore={productsLoadingMore}
              />
            </div>
          </>
        );
      },
      footer: "Total",
    },
  ];

  // Precio
  if (includePrice) {
    columns.push({
      key: "price",
      label: "Precio",
      render: (_, row) => (
        <Input
          input={row.price}
          setInput={(value) => updateProductField(row.id, "price", value)}
          placeholder="$"
          className="md:max-w-28"
        />
      ),
      footer: "-",
    });
  }

  // IVA Incluido
  if (includeIVA) {
    columns.push({
      key: "ivaIncluded",
      label: "IVA Incluido",
      render: (_, row) => (
        <Checkbox
          variant="cyan"
          checked={row.ivaIncluded}
          onCheck={(value) => updateProductField(row.id, "ivaIncluded", value)}
        />
      ),
      footer: <p>-</p>,
    });
  }

  // Cantidad
  columns.push({
    key: "quantity",
    label: "Cantidad requerida",
    render: (_, row) => (
      <Input
        input={row.quantity}
        setInput={(value) => updateProductField(row.id, "quantity", value)}
        placeholder="Cantidad"
        className="md:max-w-28"
      />
    ),
    footer: (data) =>
      unitsAreConsistent(
        data.filter((d) => d.product).map((p) => ({ unit: p?.product?.unit }))
      )
        ? format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0))
        : "-",
  });

  // Unidad
  columns.push({
    key: "id",
    label: "Unidad",
    render: (_, row) => (
      <p className="flex justify-start">{row?.product?.unit || "-"}</p>
    ),
    footer: "-",
  });

  // Total
  if (includePrice) {
    columns.push({
      key: "total",
      label: "Total",
      render: (_, row) => (
        <p className="flex justify-start md:min-w-28">
          {format(row?.total || "", "$") || "-"}
        </p>
      ),
      footer: (data) => (
        <h3 className="font-bold">
          {format(
            data.reduce((acc, d) => acc + Number(d.total || 0), 0) || "",
            currency
          ) || "-"}
        </h3>
      ),
    });
  }

  // Invoice Percentage (solo para admin)
  if (includeInvoicePercentage && user?.type === "admin") {
    columns.push({
      key: "invoicePercentage",
      label: "%",
      render: (_, row) => (
        <Input
          placeholder="%"
          className="max-w-11"
          input={row.invoicePercentage}
          setInput={(value) =>
            updateProductField(row.id, "invoicePercentage", value)
          }
        />
      ),
      footer: <p>-</p>,
    });
  }

  return columns;
}

export function createProductColumnsDetailForm({
  productKey = "product",
  productLabel = "Producto",
  productFooter,
  useProductIdAsValue = true,
  includePrice = true,
  priceLabel = "Precio",
  pricePlaceholder = "$",
  includeIVA = false,
  includeInvoicePercentage = false,
  includeItemsConfirmed = false,
  includeUnit = false,
  includeTotal = false,
  quantityKey = "requestedQuantity",
  quantityLabel = "Cantidad requerida",
  quantityPlaceholder = "Cantidad",
  quantityFooter,
  itemsLabel = "Cantidad recibida",
  itemsFooter,
  totalLabel = "Total",
  totalFooter,
  currency = "$",
  onProductChange,
} = {}) {
  const mapProductOption = (product) => ({
    label: product.name,
    value: useProductIdAsValue ? product.id : product,
  });

  const columns = [
    {
      key: productKey,
      label: productLabel,
      type: "select",
      searchable: true,
      useProductIdAsValue,
      options: (state, data, row, index, availableProducts) => {
        const currentProduct =
          row.product && typeof row.product === "object"
            ? row.product
            : availableProducts?.find((p) => p.id === row.product);
        console.log(currentProduct, "CURRENT PRODUCT", availableProducts);

        if (currentProduct) {
          return [
            mapProductOption(currentProduct),
            ...availableProducts
              .filter((p) => p.id !== currentProduct.id)
              .map((p) => mapProductOption(p)),
          ];
        }
        return availableProducts.map(mapProductOption);
      },
      footer: productFooter,
      onChange: onProductChange,
    },
  ];

  if (includePrice) {
    columns.push({
      key: "price",
      label: priceLabel,
      type: "input",
      placeholder: pricePlaceholder,
      className: "md:max-w-28",
      editable: true,
      footer: "-",
    });
  }

  if (includeIVA) {
    columns.push({
      key: "ivaIncluded",
      label: "IVA Incluido",
      type: "checkbox",
      footer: "-",
    });
  }

  columns.push({
    key: quantityKey,
    label: quantityLabel,
    type: "input",
    placeholder: quantityPlaceholder,
    className: "md:max-w-28",
    editable: true,
    footer: quantityFooter,
  });

  columns.push({
    key: "items",
    label: itemsLabel,
    type: "computed",
    compute: (row) =>
      row.items?.reduce(
        (acc, item) =>
          acc + Number(item?.quantity ?? item?.currentQuantity ?? 0),
        0
      ) || 0,
    format: (value) => format(value) || "-",
    footer: itemsFooter,
  });

  if (includeItemsConfirmed) {
    columns.push({
      key: "itemsConfirmed",
      label: "Items Confirmados",
      type: "computed",
      compute: (row) =>
        row.items?.filter((item) => Number(item?.quantity || 0) > 0).length ||
        0,
      format: (value) => format(value) || "-",
      footer: (data) =>
        format(
          data.flatMap((p) => p.items).filter((i) => i.quantity !== "")
            .length || 0,
          ""
        ) || "-",
    });
  }

  if (includeUnit) {
    columns.push({
      key: "unit",
      label: "Unidad",
      type: "computed",
      compute: (row) => row?.product?.unit || "-",
      footer: "-",
    });
  }

  if (includePrice && includeInvoicePercentage) {
    columns.push({
      key: "invoicePercentage",
      label: "%",
      type: "input",
      placeholder: "%",
      editable: true,
      footer: "-",
    });
  }

  if (includePrice && includeTotal) {
    columns.push({
      key: "total",
      label: totalLabel,
      type: "computed",
      className: "min-w-30",
      compute: (row) => {
        const totalQuantity =
          row.items?.reduce(
            (acc, item) =>
              acc + Number(item?.currentQuantity ?? item?.quantity ?? 0),
            0
          ) || 0;
        return Number(row.price || 0) * totalQuantity;
      },
      format: (value) => format(value, currency),
      footer:
        totalFooter ||
        ((data) =>
          format(
            data.reduce(
              (acc, product) =>
                acc +
                Number(product.price || 0) *
                  Number(product.quantity || product.requestedQuantity || 0),
              0
            ),
            currency
          )),
    });
  }

  return columns;
}
