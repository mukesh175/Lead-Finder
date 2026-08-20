import { NextResponse } from "next/server";

export function ok(data, init) {
  return NextResponse.json({ success: true, data, error: null }, init);
}

export function fail(code, message, status = 400) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  );
}

export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Wraps a route handler so unexpected failures never leak stack traces.
export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.code, err.message, err.status);
      console.error("[api]", err);
      return fail("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
    }
  };
}
