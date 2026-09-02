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
      <SelectTrigger className="min-w-52 max-w-72">
        <Building2Icon data-icon="inline-start" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((empresa) => (
          <SelectItem key={empresa.id} value={empresa.id}>
            {empresa.razaoSocial} ({empresa.cnpj})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
