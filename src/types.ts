export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  clobTokenIds?: string;
  outcomes?: string;
  outcomePrices?: string;
  active?: boolean;
  closed?: boolean;
  enableOrderBook?: boolean;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  endDate?: string;
  startDate?: string;
  acceptingOrders?: boolean;
  volumeNum?: number;
  liquidityNum?: number;
}

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  markets?: GammaMarket[];
  active?: boolean;
  closed?: boolean;
}

export interface GammaSeries {
  id: string;
  slug: string;
  title: string;
  events?: GammaEvent[];
}

export interface MarketInfo {
  market: GammaMarket;
  event: GammaEvent;
  seriesSlug: string;
  tokenIdYes: string;
  tokenIdNo: string;
  tickSize: string;
  minSize: number;
}
