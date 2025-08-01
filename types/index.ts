export type CallType = "onboarding" | "follow-up";

export interface Client {
  name: string;
  phone: string;
}

export interface Booking {
  id?: string;
  clientId: string;
  type: CallType;
  startTime: string;
  endTime: string;
  recurring: boolean;
}
