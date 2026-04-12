"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEmailSuggestion } from "@/hooks/use-email-suggestion";
import { cn } from "@/utils/utils";

interface EmailAutocompleteTextareaProps {
  className?: string;
  memberEmails: string[];
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

function getCurrentToken(text: string, cursorPos: number): string {
  const beforeCursor = text.slice(0, cursorPos);
  const lastSeparator = Math.max(
    beforeCursor.lastIndexOf(","),
    beforeCursor.lastIndexOf("\n")
  );
  return beforeCursor.slice(lastSeparator + 1);
}

const EMAIL_SEPARATOR = /[,\n]/;

const SHARED_STYLES =
  "whitespace-pre-wrap break-words font-mono text-xs leading-5 p-2.5";

export function EmailAutocompleteTextarea({
  value,
  onChange,
  onSubmit,
  memberEmails,
  placeholder,
  className,
}: EmailAutocompleteTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState(value.length);
  const [dismissed, setDismissed] = useState(false);

  const currentToken = getCurrentToken(value, cursorPos);
  const existingEmails = useMemo(
    () =>
      value
        .split(EMAIL_SEPARATOR)
        .map((s) => s.trim())
        .filter(Boolean),
    [value]
  );
  const suggestion = useEmailSuggestion(
    currentToken,
    memberEmails,
    existingEmails
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset dismissed when token changes
  useEffect(() => {
    setDismissed(false);
  }, [currentToken]);

  const activeSuggestion = dismissed ? null : suggestion;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setCursorPos(e.target.selectionStart);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      setCursorPos((e.target as HTMLTextAreaElement).selectionStart);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && activeSuggestion) {
        e.preventDefault();
        const before = value.slice(0, cursorPos);
        const after = value.slice(cursorPos);
        const newValue = before + activeSuggestion + after;
        const newCursorPos = cursorPos + activeSuggestion.length;
        onChange(newValue);
        setCursorPos(newCursorPos);
        setDismissed(false);

        requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        });
      } else if (e.key === "Escape" && activeSuggestion) {
        setDismissed(true);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [activeSuggestion, value, cursorPos, onChange, onSubmit]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: sync scroll position when value changes
  useEffect(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value]);

  const beforeCursor = value.slice(0, cursorPos);
  const afterCursor = value.slice(cursorPos);

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className={cn(
          SHARED_STYLES,
          "pointer-events-none absolute inset-0 overflow-hidden border border-transparent"
        )}
        ref={overlayRef}
      >
        <span className="invisible">{beforeCursor}</span>
        {activeSuggestion && (
          <span className="whitespace-nowrap text-muted-foreground/40">
            {activeSuggestion}
          </span>
        )}
        <span className="invisible">{afterCursor}</span>
      </div>

      <textarea
        className={cn(
          SHARED_STYLES,
          "relative z-10 h-full w-full resize-none border border-input bg-transparent text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        )}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onSelect={handleSelect}
        placeholder={placeholder}
        ref={textareaRef}
        rows={3}
        value={value}
      />
    </div>
  );
}
