import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { PASSWORD_RULES, evaluatePassword } from "@/lib/password-validation";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
  className?: string;
}

const strengthColor: Record<string, string> = {
  fraca: "bg-destructive",
  média: "bg-warning",
  forte: "bg-primary",
  "muito forte": "bg-primary",
};

const strengthLabelColor: Record<string, string> = {
  fraca: "text-destructive",
  média: "text-warning",
  forte: "text-primary",
  "muito forte": "text-primary",
};

export default function PasswordStrengthIndicator({ password, className }: Props) {
  const evaluation = evaluatePassword(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Força da senha:</span>
        <span className={cn("font-medium capitalize", strengthLabelColor[evaluation.strength])}>
          {evaluation.strength}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${evaluation.score}%` }}
          transition={{ duration: 0.3 }}
          className={cn("h-full rounded-full transition-colors", strengthColor[evaluation.strength])}
        />
      </div>
      <ul className="space-y-1 pt-1">
        {PASSWORD_RULES.map((rule) => {
          const passed = evaluation.passed.includes(rule.id);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                passed ? "text-primary" : "text-muted-foreground",
              )}
            >
              {passed ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
