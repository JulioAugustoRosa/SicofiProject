/**
 * Calculadora de Imposto de Renda 2026 - Brasil
 * Baseada na nova lei que isenta quem ganha até R$ 5.000/mês
 * 
 * Tabela mensal progressiva (base de cálculo):
 * - Até R$ 2.428,80: Isento
 * - R$ 2.428,81 a R$ 2.826,65: 7,5% (dedução R$ 182,16)
 * - R$ 2.826,66 a R$ 3.751,05: 15% (dedução R$ 394,16)
 * - R$ 3.751,06 a R$ 4.664,68: 22,5% (dedução R$ 675,49)
 * - Acima de R$ 4.664,68: 27,5% (dedução R$ 908,73)
 * 
 * Redutor especial:
 * - Até R$ 5.000: redução de até R$ 312,89 (zera o imposto)
 * - R$ 5.000,01 a R$ 7.350: R$ 978,62 - (0,133145 × renda)
 * - Acima de R$ 7.350: sem redução
 */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

const MONTHLY_BRACKETS: TaxBracket[] = [
  { min: 0, max: 2428.80, rate: 0, deduction: 0 },
  { min: 2428.81, max: 2826.65, rate: 0.075, deduction: 182.16 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 394.16 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 675.49 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 908.73 },
];

export interface TaxResult {
  grossIncome: number;
  taxBeforeReduction: number;
  reduction: number;
  netTax: number;
  effectiveRate: number;
  bracket: string;
  isExempt: boolean;
  netIncome: number;
}

/**
 * Calcula o redutor especial da nova lei IR 2026
 */
function calculateReduction(monthlyIncome: number, taxBeforeReduction: number): number {
  if (monthlyIncome <= 5000) {
    // Redução de até R$ 312,89, limitada ao imposto apurado
    return Math.min(312.89, taxBeforeReduction);
  }
  if (monthlyIncome <= 7350) {
    // Redução gradual: R$ 978,62 - (0,133145 × renda)
    const reduction = 978.62 - (0.133145 * monthlyIncome);
    return Math.max(0, Math.min(reduction, taxBeforeReduction));
  }
  return 0;
}

/**
 * Calcula o IR mensal com base na renda bruta mensal
 */
export function calculateMonthlyTax(monthlyIncome: number): TaxResult {
  if (monthlyIncome <= 0) {
    return {
      grossIncome: 0,
      taxBeforeReduction: 0,
      reduction: 0,
      netTax: 0,
      effectiveRate: 0,
      bracket: "Isento",
      isExempt: true,
      netIncome: 0,
    };
  }

  // Desconto simplificado do INSS (simplificação)
  // Na prática o usuário informaria o salário líquido ou bruto
  const baseCalculo = monthlyIncome;

  // Encontrar faixa
  let taxBeforeReduction = 0;
  let bracketLabel = "Isento";

  for (const bracket of MONTHLY_BRACKETS) {
    if (baseCalculo >= bracket.min) {
      if (bracket.rate > 0) {
        taxBeforeReduction = baseCalculo * bracket.rate - bracket.deduction;
        bracketLabel = `${(bracket.rate * 100).toFixed(1)}%`;
      }
    }
  }

  taxBeforeReduction = Math.max(0, taxBeforeReduction);

  const reduction = calculateReduction(monthlyIncome, taxBeforeReduction);
  const netTax = Math.max(0, taxBeforeReduction - reduction);
  const effectiveRate = monthlyIncome > 0 ? (netTax / monthlyIncome) * 100 : 0;
  const isExempt = netTax === 0;

  return {
    grossIncome: monthlyIncome,
    taxBeforeReduction,
    reduction,
    netTax,
    effectiveRate,
    bracket: isExempt ? "Isento" : bracketLabel,
    isExempt,
    netIncome: monthlyIncome - netTax,
  };
}

/**
 * Calcula o IR anual
 */
export function calculateAnnualTax(monthlyIncome: number): TaxResult {
  const monthly = calculateMonthlyTax(monthlyIncome);
  return {
    grossIncome: monthly.grossIncome * 12,
    taxBeforeReduction: monthly.taxBeforeReduction * 12,
    reduction: monthly.reduction * 12,
    netTax: monthly.netTax * 12,
    effectiveRate: monthly.effectiveRate,
    bracket: monthly.bracket,
    isExempt: monthly.isExempt,
    netIncome: monthly.netIncome * 12,
  };
}

/**
 * Retorna texto explicativo sobre a situação fiscal
 */
export function getTaxExplanation(monthlyIncome: number): string {
  const result = calculateMonthlyTax(monthlyIncome);
  
  if (monthlyIncome <= 5000) {
    return `Com renda de R$ ${monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês, você está **isento** do Imposto de Renda pela nova lei de 2026. 🎉`;
  }
  
  if (monthlyIncome <= 7350) {
    return `Com renda de R$ ${monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês, você tem **redução parcial** do IR. Imposto estimado: R$ ${result.netTax.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (alíquota efetiva: ${result.effectiveRate.toFixed(1)}%).`;
  }
  
  return `Com renda de R$ ${monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês, seu IR estimado é R$ ${result.netTax.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (alíquota efetiva: ${result.effectiveRate.toFixed(1)}%, faixa ${result.bracket}).`;
}
