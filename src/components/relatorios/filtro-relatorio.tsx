import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FiltroRelatorio({
  rotulo,
  valor,
  opcoes,
  onChange,
  largura = "w-44",
  className,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string; disabled?: boolean }[];
  onChange: (valor: string) => void;
  /** Largura do gatilho; largura fixa evita quebrar a barra em duas linhas. */
  largura?: string;
  className?: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={rotulo} className={cn("h-9 text-xs", largura, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {opcoes.map((opcao) => (
            <SelectItem
              key={opcao.valor}
              value={opcao.valor}
              disabled={opcao.disabled}
            >
              {opcao.rotulo}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
