"use client";

import { createContext, useContext } from "react";
import type { ContextoExportacao } from "./exportar-visao";

export const ReportContext = createContext<{
  titulo: string;
  contexto: ContextoExportacao;
  preferenceScope: string;
} | null>(null);
export const useReportContext = () => useContext(ReportContext);
