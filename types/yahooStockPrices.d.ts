declare module 'yahoo-stock-prices' {
  export interface StockPrice {
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjclose: number;
  }
  export function getHistoricalPrices(
    startMonth: number,
    startDay: number,
    startYear: number,
    endMonth: number,
    endDay: number,
    endYear: number,
    ticker: string,
    frequency: '1d',
    callback?: () => {}
  ): Promise<StockPrice[]>;
}
