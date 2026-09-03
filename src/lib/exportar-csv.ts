/**
 * Exportador universal para CSV compatível com Microsoft Excel em Português (UTF-8 com BOM e separador ;)
 */

export function exportarParaCSV(nomeArquivo: string, colunas: string[], linhas: (string | number)[][]) {
  const cabecalho = colunas.map((col) => `"${col.replace(/"/g, '""')}"`).join(";");

  const corpo = linhas
    .map((linha) =>
      linha
        .map((valor) => {
          if (valor === null || valor === undefined) return '""';
          const formatado = String(valor).replace(/"/g, '""');
          return `"${formatado}"`;
        })
        .join(";")
    )
    .join("\r\n");

  const csvCompleto = "\uFEFF" + cabecalho + "\r\n" + corpo; // \uFEFF adiciona o BOM UTF-8
  const blob = new Blob([csvCompleto], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${nomeArquivo}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
