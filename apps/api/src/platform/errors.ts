export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly fields?: { path: string; message: string }[]) { super(message); }
}
export const notFound = () => new ApiError(404, 'not_found', 'The record was not found or is not available to you.');
