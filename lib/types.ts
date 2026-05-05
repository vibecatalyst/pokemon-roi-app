export interface CardData {
  id: string;
  name: string;
  set: string;
  number: string;
  rarity: string;
  image: string;
  rawPrice: number;
  psa10Price: number;
  psa9Price?: number;
  tcgPlayerId: string;
}

export interface FeeSettings {
  gradingFee: number;
  shippingToGrader: number;
  shippingBack: number;
  ebayFeePercent: number;
  buyingFeePercent: number;
}
