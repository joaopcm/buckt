import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useRef } from "react";

export function useCursorPagination(defaultLimit = 20) {
  const [cursor, setCursor] = useQueryState("cursor", parseAsString);
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(defaultLimit)
  );
  const cursorStackRef = useRef<(string | null)[]>([]);

  const pageIndex = cursorStackRef.current.length;

  function nextPage(nextCursor: string) {
    cursorStackRef.current.push(cursor);
    setCursor(nextCursor);
  }

  function previousPage() {
    const prev = cursorStackRef.current.pop() ?? null;
    setCursor(prev);
  }

  function resetPagination() {
    setCursor(null);
    cursorStackRef.current = [];
  }

  return {
    cursor: cursor ?? undefined,
    limit,
    setLimit,
    pageIndex,
    nextPage,
    previousPage,
    resetPagination,
    hasPreviousPage: pageIndex > 0,
  };
}
