/**
 * Regras de senha forte do SICOFI.
 *
 * Cada requisito é uma função booleana sobre a senha; agrupamos em uma lista
 * para que a UI possa renderizar a checklist e a tela de cadastro/troca de
 * senha possa bloquear o submit até que todos sejam atendidos.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Mínimo de 8 caracteres",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "Pelo menos uma letra maiúscula",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "Pelo menos uma letra minúscula",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "Pelo menos um número",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "Pelo menos um caractere especial (!@#$%...)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordEvaluation {
  isValid: boolean;
  passed: string[];
  failed: string[];
  strength: "fraca" | "média" | "forte" | "muito forte";
  /** Pontuação de 0 a 100, útil para barras de progresso. */
  score: number;
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const passed: string[] = [];
  const failed: string[] = [];

  for (const rule of PASSWORD_RULES) {
    if (rule.test(password)) passed.push(rule.id);
    else failed.push(rule.id);
  }

  const score = Math.round((passed.length / PASSWORD_RULES.length) * 100);

  let strength: PasswordEvaluation["strength"];
  if (score < 40) strength = "fraca";
  else if (score < 70) strength = "média";
  else if (score < 100) strength = "forte";
  else strength = "muito forte";

  return {
    isValid: failed.length === 0,
    passed,
    failed,
    score,
    strength,
  };
}

/**
 * Retorna a primeira mensagem de falha encontrada, útil para usar
 * em toasts ou no `setCustomValidity` de um `<input>`.
 */
export function firstPasswordError(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label;
  }
  return null;
}
