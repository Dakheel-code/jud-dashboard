export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  spend: number;
  impressions: number;
  swipes: number;
  orders: number;
  sales: number;
  cpa: number;
  roas: number;
}

export interface AdSquad {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  swipes: number;
  orders: number;
  sales: number;
  cpa: number;
  roas: number;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  type: string;
  ad_squad_id: string;
  ad_squad_name: string;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
}
