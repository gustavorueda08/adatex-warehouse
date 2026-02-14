import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { hookSelector } from "../utils/hookSelector";
import { useAsyncList } from "@react-stately/data";

export function useEntityList({
  listType = "orders",
  limit = 10,
  filters = () => {},
  populate = () => [],
  selectedOption = null,
  enabled = true,
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState([]);

  const queryParams = useMemo(() => {
    // Different entities have different sortable fields
    let sortField = [];
    switch (listType) {
      case "orders":
      case "sales":
      case "purchases":
      case "inflows":
      case "outflows":
      case "returns":
      case "transformations":
      case "transfers":
        sortField = ["createdAt:desc"];
        break;
      case "territories":
        sortField = ["city:asc"];
        break;
      case "items":
        sortField = ["currentQuantity:asc"]; // Or name:asc, assuming items have description
        break;
      case "lines":
      case "collections":
        sortField = ["name:asc"];
        break;
      default:
        sortField = ["name:asc"];
        break;
    }

    return {
      pagination: { page, pageSize: limit },
      sort: sortField,
      filters:
        typeof filters === "function" ? filters(debouncedSearch) : filters,
      populate:
        typeof populate === "function" ? populate(debouncedSearch) : populate,
    };
  }, [page, limit, debouncedSearch, filters, populate, listType]);

  const { loading, isFetching, pagination, entities, hasNextPage, ...rest } =
    hookSelector(listType)(queryParams, { enabled });

  const onLoadMore = () => {
    if (hasNextPage && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (debouncedSearch) {
      setPage(1);
      setOptions([]);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (loading) return;

    setOptions((prev) => {
      // If page 1, start fresh, otherwise append
      let currentList = page === 1 ? [] : prev;
      // Merge entities and actualSelectedOption
      let candidates = [...currentList, ...(entities || [])];
      if (selectedOption) {
        if (Array.isArray(selectedOption)) {
          candidates = [...selectedOption, ...candidates];
        } else {
          // Prepend usage of actualSelectedOption to ensure it appears
          candidates = [selectedOption, ...candidates];
        }
      }
      const uniqueItems = new Map();
      candidates.forEach((item) => {
        const key =
          item && typeof item === "object" && "id" in item ? item.id : item;

        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, item);
        }
      });
      return Array.from(uniqueItems.values());
    });
  }, [entities, loading, page]);

  // Effect to ensure selected options are always in the list without resetting it
  useEffect(() => {
    if (!selectedOption) return;

    setOptions((prev) => {
      let candidates = [...prev];
      if (Array.isArray(selectedOption)) {
        candidates = [...selectedOption, ...candidates];
      } else {
        candidates = [selectedOption, ...candidates];
      }

      const uniqueItems = new Map();
      candidates.forEach((item) => {
        const key =
          item && typeof item === "object" && "id" in item ? item.id : item;

        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, item);
        }
      });
      return Array.from(uniqueItems.values());
    });
  }, [selectedOption]);

  return {
    ...rest,
    isLoading: loading,
    pagination,
    options,
    onLoadMore,
    hasMore: hasNextPage,
    setSearch,
  };
}
