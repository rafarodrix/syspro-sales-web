import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FiltroRelatorio({
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string; disabled?: boolean }[];
  onChange: (valor: string) => void;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={rotulo} className="w-full sm:w-auto">
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
