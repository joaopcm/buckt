import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useRef } from "react";

export function useCursorPagination(opts?: {
  defaultLimit?: number;
  cursorKey?: string;
  limitKey?: string;
}) {
  const {
    defaultLimit = 20,
    cursorKey = "cursor",
    limitKey = "limit",
  } = opts ?? {};

  const [cursor, setCursor] = useQueryState(cursorKey, parseAsString);
  const [limit, setLimit] = useQueryState(
    limitKey,
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
