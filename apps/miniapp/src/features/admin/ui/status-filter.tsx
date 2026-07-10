"use client";

import { useRouter } from "next/navigation";
import { ChipTabs } from "@repo/ui";
import { haptic } from "@/shared/lib/haptics";
import { STATUS_FILTERS, type StatusFilterValue } from "../model/filters";

type Props = {
  value: StatusFilterValue;
  /** Счётчик для чипса «Новые» */
  newCount: number;
};

/** Фильтр по статусу: значение живёт в ?status= — RSC перезапрашивает список. */
export function StatusFilter({ value, newCount }: Props) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto scrollbar-none">
      <ChipTabs
        aria-label="Фильтр по статусу"
        tabs={STATUS_FILTERS.map((f) => ({
          value: f.value,
          label: f.label,
          badge: f.value === "new" && newCount > 0 ? newCount : undefined,
        }))}
        value={value}
        onChange={(next: string) => {
          haptic.selection();
          router.replace(next === "all" ? "/admin" : `/admin?status=${next}`, {
            scroll: false,
          });
        }}
      />
    </div>
  );
}
