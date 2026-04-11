"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useEmailSuggestion } from "@/hooks/use-email-suggestion";
import { cn } from "@/utils/utils";

interface EmailAutocompleteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  memberEmails: string[];
  placeholder?: string;
  className?: string;
}

function getCurrentToken(text: string, cursorPos: number): string {
  const beforeCursor = text.slice(0, cursorPos);
  const lastSeparator = Math.max(
    beforeCursor.lastIndexOf(","),
    beforeCursor.lastIndexOf("\n")
  );
  return beforeCursor.slice(lastSeparator + 1);
}

const SHARED_STYLES =
  "whitespace-pre-wrap break-words font-mono text-xs leading-5 p-2.5";

export function EmailAutocompleteTextarea({
  value,
  onChange,
  memberEmails,
  placeholder,
  className,
}: EmailAutocompleteTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState(value.length);

  const currentToken = getCurrentToken(value, cursorPos);
  const suggestion = useEmailSuggestion(currentToken, memberEmails);

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
      if (e.key === "Tab" && suggestion) {
        e.preventDefault();
        const before = value.slice(0, cursorPos);
        const after = value.slice(cursorPos);
        const newValue = before + suggestion + after;
        const newCursorPos = cursorPos + suggestion.length;
        onChange(newValue);
        setCursorPos(newCursorPos);

        requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [suggestion, value, cursorPos, onChange]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

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
        ref={overlayRef}
        aria-hidden="true"
        className={cn(
          SHARED_STYLES,
          "pointer-events-none absolute inset-0 overflow-hidden border border-transparent"
        )}
      >
        <span className="invisible">{beforeCursor}</span>
        {suggestion && (
          <span className="text-muted-foreground/40">{suggestion}</span>
        )}
        <span className="invisible">{afterCursor}</span>
      </div>

      <textarea
        ref={textareaRef}
        className={cn(
          SHARED_STYLES,
          "relative z-10 h-full w-full resize-none border border-input bg-transparent text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        )}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onSelect={handleSelect}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
    </div>
  );
}
