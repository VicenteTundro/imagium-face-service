import { STATUS_LABEL, type Status } from "@/lib/types";
import { Pausa, Bloqueio, Xis } from "./icons";

const STEP: Partial<Record<Status, number>> = { cadastrado: 1, aberto: 2, completo: 3, vendendo: 4 };
const OFF_FLOW = { pausado: Pausa, bloqueado: Bloqueio, cancelado: Xis } as const;

export function StatusPill({ status }: { status: Status }) {
  const step = STEP[status];
  if (step) {
    return (
      <span className={`pill st-${status}`}>
        <span className="passos" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}
        </span>
        {STATUS_LABEL[status]}
      </span>
    );
  }
  const Icon = OFF_FLOW[status as keyof typeof OFF_FLOW];
  return (
    <span className="pill st-fora">
      <Icon />
      {STATUS_LABEL[status]}
    </span>
  );
}
