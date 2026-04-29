/** `ad.approved` webhook / entegrasyon gövdesi (yönetici paneli + sunucu). */
export type NewAdApprovedWebhookPayload = {
  event: "ad.approved";
  at: string;
  ad: {
    id: string;
    listingNumber: number;
    title: string;
    titleDisplay: string;
    description: string;
    province: string;
    city: string;
    district: string;
    professionId: string | null;
    professionName: string | null;
    ownerId: string;
    approvedAt: string | null;
  };
  matchedMembers: { userId: string; email: string }[];
  emailDelivery: {
    memberEmailsEnabled: boolean;
    attempted: number;
    smtpNotConfigured: boolean;
  };
};
