import test from "node:test";
import assert from "node:assert/strict";

import { parseIbkrReport } from "../src/parser.js";

const csv = `Statement,Header,Field Name,Field Value
Statement,Data,Period,"January 1, 2026 - August 14, 2026"
Account Information,Header,Field Name,Field Value
Account Information,Data,Account,U1234567
Account Information,Data,Base Currency,USD
Net Asset Value,Header,Asset Class,Prior Total,Current Long,Current Short,Current Total,Change
Net Asset Value,Data,Total,16823.939675699,35683.898791359,0,35683.898791359,18859.95911566
Net Asset Value,Header,Time Weighted Rate of Return
Net Asset Value,Data,63.271549897%
Change in NAV,Header,Field Name,Field Value
Change in NAV,Data,Starting Value,16823.939675699
Change in NAV,Data,Mark-to-Market,21872.64259096
Change in NAV,Data,Deposits & Withdrawals,-3013.5889776
Change in NAV,Data,Dividends,26.73
Change in NAV,Data,Withholding Tax,-3.82
Change in NAV,Data,Interest,20.58
Change in NAV,Data,Other Fees,-0.15
Change in NAV,Data,Commissions,-42.43449814
Change in NAV,Data,Ending Value,35683.898791359
Total P/L for Statement Period,,,,,,,,,,,,21873.54809282,
Realized & Unrealized Performance Summary,Header,Asset Category,Symbol,Cost Adj.,Realized S/T Profit,Realized S/T Loss,Realized L/T Profit,Realized L/T Loss,Realized Total,Unrealized S/T Profit,Unrealized S/T Loss,Unrealized L/T Profit,Unrealized L/T Loss,Unrealized Total,Total,Code
Realized & Unrealized Performance Summary,Data,Total (All Assets),,0,23379.1372968,-3754.45274244,0,0,19624.68455436,3396.63255,-563.670559,0,0,2832.961991,22457.64654536,
Cash Report,Header,Currency Summary,Currency,Total,Securities,Futures,
Cash Report,Data,Deposits,Base Currency Summary,22000,22000,0,
Cash Report,Data,Withdrawals,Base Currency Summary,-25013.5889776,-25013.5889776,0,`;

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to equal ${expected}`);
}

test("keeps statement-period and cost-basis performance as separate dimensions", () => {
  const result = parseIbkrReport(csv);

  assert.equal(result.periodPerformance.source, "statement");
  assertClose(result.periodPerformance.startingValue, 16823.939675699);
  assertClose(result.periodPerformance.endingValue, 35683.898791359);
  assertClose(result.periodPerformance.deposits, 22000);
  assertClose(result.periodPerformance.withdrawals, 25013.5889776);
  assertClose(result.periodPerformance.netCashFlow, -3013.5889776);
  assertClose(result.periodPerformance.navChange, 18859.95911566);
  assertClose(result.periodPerformance.calculatedProfitLoss, 21873.54809326);
  assertClose(result.periodPerformance.profitLoss, 21873.54809282);
  assertClose(result.periodPerformance.timeWeightedReturn, 63.271549897);

  assert.deepEqual(result.plSummary.total, {
    realized: 19624.68455436,
    unrealized: 2832.961991,
    total: 22457.64654536,
    grossRealizedProfit: 23379.1372968,
    grossRealizedLoss: 3754.45274244,
    realizedProfitLossRatio: 23379.1372968 / 3754.45274244
  });
});

test("normalizes Chinese cash-flow labels for period performance", () => {
  const chineseCashCsv = csv
    .replace(
      "Total P/L for Statement Period,,,,,,,,,,,,21873.54809282,",
      "账单期间的总损益,,,,,,,,,,,,21873.54809282,"
    )
    .replace(
      "Cash Report,Header,Currency Summary,Currency,Total,Securities,Futures,",
      "现金报告,Header,货币总结,货币,总数,证券,期货,"
    )
    .replace(
      "Cash Report,Data,Deposits,Base Currency Summary,22000,22000,0,",
      "现金报告,Data,存款,基础货币总结,22000,22000,0,"
    )
    .replace(
      "Cash Report,Data,Withdrawals,Base Currency Summary,-25013.5889776,-25013.5889776,0,",
      "现金报告,Data,取款,基础货币总结,-25013.5889776,-25013.5889776,0,"
    );

  const result = parseIbkrReport(chineseCashCsv);

  assert.equal(result.periodPerformance.source, "statement");
  assertClose(result.periodPerformance.deposits, 22000);
  assertClose(result.periodPerformance.withdrawals, 25013.5889776);
  assertClose(result.periodPerformance.profitLoss, 21873.54809282);
});
