import { Request } from 'express';
import { IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

export type CollectionAuthType = 'none' | 'bearer' | 'custom';

export interface CollectionAuthConfig {
  type: CollectionAuthType;
  token?: string;
  headerName?: string;
  headerValue?: string;
}

export interface ProxyRequestData {
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  body?: string;
  collectionId?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}
