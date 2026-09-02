export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errors?: unknown[],
  ) {
    super(message);
    this.name = "AppError";
  }
}
