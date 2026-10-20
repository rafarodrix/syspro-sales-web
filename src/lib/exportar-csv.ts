/**
 * Exportador universal para CSV compatível com Microsoft Excel em Português
 * (UTF-8 com BOM, separador ";" e decimais com ",").
 */

const CARACTERES_INJECAO = ["=", "+", "-", "@", "\t", "\r"];
const NUMERO_PT_BR = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+([.,]\d+)?$/;

export function exportarParaCSV(nomeArquivo: string, colunas: string[], linhas: (string | number | null | undefined)[][]) {
  const sanitizar = (texto: string) => {
    // Números no padrão pt-BR (ex.: -12,5) são preservados para o Excel reconhecer como valor
    const numerico = NUMERO_PT_BR.test(texto);
    // Previne CSV Injection (se iniciar com =, +, -, @, tab ou CR, prefixa com apóstrofo)
    const seguro = !numerico && CARACTERES_INJECAO.includes(texto.charAt(0))
      ? `'${texto}`
      : texto;
    return seguro.replace(/"/g, '""');
  };

  const cabecalho = colunas.map((col) => `"${sanitizar(String(col))}"`).join(";");

  const corpo = linhas
    .map((linha) =>
      linha
        .map((valor) => {
          if (valor === null || valor === undefined) return '""';
          const formatado = sanitizar(String(valor));
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
