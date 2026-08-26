export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = (msg = "access denied.") => new ApiError(401, msg);
export const forbidden = (msg = "insufficient clearance.") => new ApiError(403, msg);
export const notFound = (what = "resource") => new ApiError(404, `${what} not found.`);
export const badRequest = (msg: string) => new ApiError(400, msg);
export const tooMany = (msg = "rate limit exceeded. the brain needs a moment.") =>
  new ApiError(429, msg);
