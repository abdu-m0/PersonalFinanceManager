// Placeholder analytics service - to be implemented with real aggregation logic.
export async function getCashflowForecastFor(_horizonDays?: number) {
  return { horizonDays: _horizonDays ?? 30, entries: [], asOf: new Date().toISOString(), currency: 'MVR', startingBalance: 0 };
}

export async function getReportSummary() {
  return { timeframeStart: null, timeframeEnd: null, spendingByCategory: [], incomeVsExpense: [], netWorth: [], creditCardUtilization: [], budgetVsActual: [], cashflowProjection: [] };
}
