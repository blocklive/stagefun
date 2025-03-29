import { NextRequest, NextResponse } from "next/server";
import type { User } from "../supabase";

/**
 * Privy token payload interface
 */
export interface PrivyTokenPayload {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sid?: string;
  [key: string]: any;
}

/**
 * Authentication context provided to authenticated handlers
 */
export interface AuthContext {
  userId: string;
  privyDid: string;
  tokenPayload: PrivyTokenPayload;
}

/**
 * Result of user resolution from Privy DID
 */
export interface UserResolutionResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  privyDid?: string;
  error?: string;
  statusCode?: number;
  data?: {
    tokenPayload?: PrivyTokenPayload;
    [key: string]: any;
  };
}

/**
 * Generic NextResponse with any data type
 */
export type ApiResponse<T = any> = NextResponse<T>;
