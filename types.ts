export interface Account {
  id: string;
  address: string;
  password?: string;
  token?: string;
  quota?: number;
  used?: number;
  createdAt?: string;
}

export interface Message {
  id: string;
  accountId: string;
  msgid: string;
  from: {
    address: string;
    name: string;
  };
  to: {
    address: string;
    name: string;
  };
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  createdAt: string;
  text?: string;
  html?: string[];
}

export interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum ViewState {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  EMAIL_DETAIL = 'EMAIL_DETAIL',
  ABOUT = 'ABOUT',
  RATE = 'RATE',
  PRIVACY = 'PRIVACY',
  VISION = 'VISION',
  CONTACT = 'CONTACT',
  FOLLOW = 'FOLLOW'
}

export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
