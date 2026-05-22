"use client";

const tokenKey = "kalpavruksha-admin-token";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(tokenKey);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(tokenKey, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(tokenKey);
}
