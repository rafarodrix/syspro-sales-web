import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ResumoVendas, VendaAgrupada, ProdutoRankeado } from "@/lib/vendas";
import type { Periodo } from "@/components/date-range-filter";
import type { jsPDF } from "jspdf";

interface ContextoRelatorio {
  empresaNome: string;
  cnpj?: string;
  periodo: Periodo;
}

// Cores do Padrão Corporativo Trilink Syspro
const CORES = {
  primary: [37, 99, 235] as [number, number, number], // Azul Royal #2563EB
  primaryDark: [30, 64, 175] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number], // Slate 800
  muted: [100, 116, 139] as [number, number, number], // Slate 500
  border: [226, 232, 240] as [number, number, number], // Slate 200
  bgLight: [248, 250, 252] as [number, number, number], // Slate 50
  accent: [16, 185, 129] as [number, number, number], // Emerald
};

function formatarDataBR(dataIso: string): string {
  if (!dataIso) return "";
  const partes = dataIso.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataIso;
}

async function carregarPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

function adicionarCabecalho(doc: jsPDF, titulo: string, contexto: ContextoRelatorio) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra Superior Colorida
  doc.setFillColor(...CORES.primary);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Logotipo / Marca Texto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...CORES.primaryDark);
  doc.text("TRILINK", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...CORES.muted);
  doc.text("SYSPRO ERP", 42, 16);

  // Linha divisória da marca
  doc.setDrawColor(...CORES.border);
  doc.line(14, 20, pageWidth - 14, 20);

  // Título do Relatório
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...CORES.dark);
  doc.text(titulo, 14, 27);

  // Dados da Empresa & Período
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CORES.muted);

  const textoEmpresa = contexto.cnpj
    ? `Empresa: ${contexto.empresaNome} · CNPJ: ${contexto.cnpj}`
    : `Empresa: ${contexto.empresaNome}`;

  doc.text(textoEmpresa, 14, 32);

  const periodoTexto = `Período: ${formatarDataBR(contexto.periodo.inicial)} a ${formatarDataBR(contexto.periodo.final)}`;
  const agora = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const emissaoTexto = `Gerado em: ${agora}`;

  doc.text(periodoTexto, pageWidth - 14, 27, { align: "right" });
  doc.text(emissaoTexto, pageWidth - 14, 32, { align: "right" });

  doc.line(14, 35, pageWidth - 14, 35);
}

function adicionarRodape(doc: jsPDF) {
  const totalPaginas = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CORES.muted);

    doc.setDrawColor(...CORES.border);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(
      "SysproERP Reports · Trilink Software · Relatório Gerencial Confidencial",
      14,
      pageHeight - 7,
    );
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - 14, pageHeight - 7, {
      align: "right",
    });
  }
}

function despacharPdf(
  doc: jsPDF,
  nomeArquivo: string,
  modo: "download" | "imprimir" = "download",
) {
  adicionarRodape(doc);
  if (modo === "imprimir") {
    doc.autoPrint();
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(blobUrl, "_blank");
      }
    }, 400);
  } else {
    doc.save(nomeArquivo);
  }
}

/**
 * Exporta o Dashboard Executivo com KPIs e Principais Motores de Venda
 */
export async function exportarPdfDashboard({
  contexto,
  resumo,
  topProdutos,
  modo = "download",
}: {
  contexto: ContextoRelatorio;
  resumo: ResumoVendas;
  topProdutos: ProdutoRankeado[];
  modo?: "download" | "imprimir";
}) {
  const { jsPDF, autoTable } = await carregarPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  adicionarCabecalho(doc, "Dashboard Executivo de Vendas", contexto);

  // Grid de KPIs Principais (3 Colunas x 2 Linhas)
  const startY = 40;
  const kpis = [
    { label: "FATURAMENTO TOTAL", valor: formatarMoeda(resumo.faturamento) },
    { label: "PEDIDOS / NOTAS", valor: formatarNumero(resumo.notas, 0) },
    { label: "TICKET MÉDIO", valor: formatarMoeda(resumo.ticketMedio) },
    { label: "TOTAL DE ITENS", valor: formatarNumero(resumo.quantidadeItens, 2) },
    { label: "TOTAL DE CLIENTES", valor: formatarNumero(resumo.clientes, 0) },
    { label: "TAXA MÉDIA DESCONTO", valor: `${formatarPercentual(resumo.taxaDesconto, 1)} (${formatarMoeda(resumo.descontos)})` },
  ];

  const cardWidth = 58;
  const cardHeight = 15;
  const gap = 4;

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    doc.setFillColor(...CORES.bgLight);
    doc.setDrawColor(...CORES.border);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...CORES.muted);
    doc.text(kpi.label, x + 3, y + 4.5);

    doc.setFontSize(10);
    doc.setTextColor(...CORES.dark);
    doc.text(kpi.valor, x + 3, y + 11.5);
  });

  const currentY = startY + 2 * (cardHeight + gap) + 6;

  // Tabela: Top Produtos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CORES.dark);
  doc.text("Top Produtos por Faturamento", 14, currentY);

  autoTable(doc, {
    startY: currentY + 2,
    head: [["#", "Código", "Descrição do Produto", "Qtd", "Faturamento", "Part. %"]],
    body: topProdutos.map((p, idx) => [
      String(idx + 1),
      p.id,
      p.produto,
      formatarNumero(p.quantidade, 2),
      formatarMoeda(p.total),
      formatarPercentual(p.percentual, 1),
    ]),
    theme: "striped",
    headStyles: {
      fillColor: CORES.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: CORES.dark,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22, font: "courier" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 22, halign: "right", font: "courier" },
      4: { cellWidth: 28, halign: "right", font: "courier", fontStyle: "bold" },
      5: { cellWidth: 20, halign: "right", font: "courier" },
    },
    margin: { left: 14, right: 14 },
  });

  // Tabela: Departamentos e Vendedores
  const lastAutoTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const lastY = (lastAutoTable.lastAutoTable?.finalY ?? currentY) + 8;

  if (lastY < 230) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...CORES.dark);
    doc.text("Faturamento por Departamento", 14, lastY);

    autoTable(doc, {
      startY: lastY + 2,
      head: [["Departamento", "Faturamento", "Participação %"]],
      body: resumo.porDepartamento.slice(0, 8).map((d) => [
        d.nome,
        formatarMoeda(d.total),
        formatarPercentual(d.percentual, 1),
      ]),
      theme: "striped",
      headStyles: {
        fillColor: CORES.primaryDark,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 35, halign: "right", font: "courier", fontStyle: "bold" },
        2: { cellWidth: 30, halign: "right", font: "courier" },
      },
      margin: { left: 14, right: 14 },
    });
  }

  despacharPdf(
    doc,
    `dashboard-executivo-${contexto.periodo.inicial}-a-${contexto.periodo.final}.pdf`,
    modo,
  );
}

/**
 * Exporta Relatório de Notas Fiscais Emitidas
 */
export async function exportarPdfVendas({
  contexto,
  notas,
  modo = "download",
}: {
  contexto: ContextoRelatorio;
  notas: VendaAgrupada[];
  modo?: "download" | "imprimir";
}) {
  const { jsPDF, autoTable } = await carregarPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  adicionarCabecalho(doc, "Relatório de Notas Fiscais Emitidas", contexto);

  const totalFaturado = notas.reduce((acc, n) => acc + n.total, 0);
  const totalItens = notas.reduce((acc, n) => acc + n.quantidadeItens, 0);

  autoTable(doc, {
    startY: 40,
    head: [["NF", "Emissão", "Empresa", "Cliente", "Cidade/UF", "Vendedor", "Forma Pagto", "Itens", "Valor Total"]],
    body: notas.map((n) => [
      n.numero,
      n.emissao,
      n.empresaNome || "Principal",
      n.cliente,
      [n.cidade, n.uf].filter(Boolean).join("/"),
      n.vendedor,
      n.formaPagamento,
      formatarNumero(n.quantidadeItens, 2),
      formatarMoeda(n.total),
    ]),
    foot: [[
      "TOTAL GERAL",
      "",
      "",
      `${notas.length} notas`,
      "",
      "",
      "",
      formatarNumero(totalItens, 2),
      formatarMoeda(totalFaturado),
    ]],
    theme: "striped",
    headStyles: {
      fillColor: CORES.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    footStyles: {
      fillColor: CORES.dark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: CORES.dark,
    },
    columnStyles: {
      0: { cellWidth: 16, font: "courier", fontStyle: "bold" },
      1: { cellWidth: 18, font: "courier" },
      2: { cellWidth: 32 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 28 },
      5: { cellWidth: 26 },
      6: { cellWidth: 24 },
      7: { cellWidth: 18, halign: "right", font: "courier" },
      8: { cellWidth: 28, halign: "right", font: "courier", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  despacharPdf(
    doc,
    `vendas-syspro-${contexto.periodo.inicial}-a-${contexto.periodo.final}.pdf`,
    modo,
  );
}

/**
 * Exporta Relatório Analítico Genérico (Curva ABC, Vendedores, Clientes, etc.)
 */
export async function exportarPdfAnalitico({
  titulo,
  contexto,
  colunas,
  linhas,
  kpis,
  modo = "download",
}: {
  titulo: string;
  contexto: ContextoRelatorio;
  colunas: string[];
  linhas: (string | number)[][];
  kpis?: { label: string; valor: string }[];
  modo?: "download" | "imprimir";
}) {
  const { jsPDF, autoTable } = await carregarPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  adicionarCabecalho(doc, titulo, contexto);

  let currentY = 40;

  if (kpis && kpis.length > 0) {
    const cardWidth = Math.min(58, (doc.internal.pageSize.getWidth() - 28 - (kpis.length - 1) * 4) / kpis.length);
    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 4);
      doc.setFillColor(...CORES.bgLight);
      doc.setDrawColor(...CORES.border);
      doc.roundedRect(x, currentY, cardWidth, 14, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...CORES.muted);
      doc.text(kpi.label, x + 3, currentY + 4.5);

      doc.setFontSize(9.5);
      doc.setTextColor(...CORES.dark);
      doc.text(kpi.valor, x + 3, currentY + 10.5);
    });
    currentY += 18;
  }

  autoTable(doc, {
    startY: currentY,
    head: [colunas],
    body: linhas,
    theme: "striped",
    headStyles: {
      fillColor: CORES.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: CORES.dark,
    },
    margin: { left: 14, right: 14 },
  });

  const nomeArquivo = titulo.toLowerCase().replace(/[^a-z0-9]/g, "-");
  despacharPdf(
    doc,
    `${nomeArquivo}-${contexto.periodo.inicial}-a-${contexto.periodo.final}.pdf`,
    modo,
  );
}
