"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmValue,
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  confirmValue: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const matches = inputValue === confirmValue;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setInputValue("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="space-y-2">
          <Label htmlFor="confirm-input">
            Type <strong className="text-foreground">{confirmValue}</strong> to
            confirm
          </Label>
          <Input
            autoComplete="off"
            id="confirm-input"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmValue}
            value={inputValue}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!matches || loading}
            onClick={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
