"use client";

import type { VendaProduto } from "@/lib/syspro-api";
import type { Periodo } from "@/components/date-range-filter";
import { DashboardView } from "@/components/dashboard-view";
import { VendasView } from "@/components/vendas-view";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: VendaProduto[];
  initialError?: string;
  variant?: "dashboard" | "vendas";
}

export function VendasClient({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
  variant = "vendas",
}: Props) {
  if (variant === "dashboard") {
    return (
      <DashboardView
        empresas={empresas}
        empresaInicial={empresaInicial}
        initialPeriod={initialPeriod}
        initialVendas={initialVendas}
        initialError={initialError}
      />
    );
  }

  return (
    <VendasView
      empresas={empresas}
      empresaInicial={empresaInicial}
      initialPeriod={initialPeriod}
      initialVendas={initialVendas}
      initialError={initialError}
    />
  );
}
