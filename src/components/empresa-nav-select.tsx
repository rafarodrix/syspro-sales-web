"use client";

import { Building2Icon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmpresaOption {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export function EmpresaNavSelect({
  empresas,
  empresaSelecionada,
}: {
  empresas: EmpresaOption[];
  empresaSelecionada?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!empresas.length) return null;
  const value =
    empresaSelecionada &&
    empresas.some((empresa) => empresa.id === empresaSelecionada)
      ? empresaSelecionada
      : empresas[0].id;
  return (
    <Select
      value={value}
      onValueChange={(empresaId) => {
        const params = new URLSearchParams(searchParams);
        params.set("empresa", empresaId);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="h-8 max-w-64 gap-1.5 rounded-lg border bg-background px-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/30">
        <Building2Icon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((empresa) => (
          <SelectItem key={empresa.id} value={empresa.id} className="text-xs">
            {empresa.razaoSocial} ({empresa.cnpj})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
