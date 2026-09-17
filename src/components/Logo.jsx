import { CheckCheck } from 'lucide-react';

export default function Logo() {
  return <div className="brand" aria-label="Controle de tarefas">
    <span className="brand-mark"><CheckCheck size={23} aria-hidden="true" /></span>
    <span className="brand-name">controle.</span>
  </div>;
}
