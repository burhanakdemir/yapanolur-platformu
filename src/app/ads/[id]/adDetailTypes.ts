type Bid = {
  id: string;
  amountTry: number;
  message: string | null;
  createdAt: string;
  bidder: {
    id: string;
    email: string;
    name?: string | null;
    memberNumber?: number;
  };
};

type AdPhoto = {
  id: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
};

export type Ad = {
  id: string;
  ownerId: string;
  listingNumber: number;
  title: string;
  description: string;
  city: string;
  province: string;
  district: string;
  neighborhood: string;
  status?: string;
  startingPriceTry?: number;
  auctionEndsAt?: string | null;
  showcaseUntil?: string | null;
  blockNo?: string | null;
  parcelNo?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  categoryId?: string | null;
  professionId?: string | null;
  category?: { id: string; name: string; imageUrl?: string | null } | null;
  /** API: yaprak + üst kategorilerde ilk dolu görsel URL */
  categoryImageUrl?: string | null;
  photos?: AdPhoto[];
  owner: {
    id: string;
    email: string;
    name: string | null;
    memberNumber: number;
    profilePhotoUrl: string | null;
  };
  bids: Bid[];
  /** Farklı teklif veren kişi sayısı (özet kartı; API her zaman gönderir). */
  bidderCount?: number;
  _count?: { watchers: number };
  viewer?: { canBid: boolean; bidAccessRequired: boolean; canViewBidderSummary?: boolean };
};
