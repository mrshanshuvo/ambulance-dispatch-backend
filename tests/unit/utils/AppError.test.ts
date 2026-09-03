import { describe, expect, it } from "vitest";
import { AppError } from "../../../src/utils/AppError";

describe("AppError Utility", () => {
  it("should correctly set message and statusCode", () => {
    const error = new AppError("Resource not found", 404);

    expect(error.message).toBe("Resource not found");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("AppError");
    expect(error instanceof Error).toBe(true);
  });

  it("should store optional errors array", () => {
    const customErrors = [{ field: "email", message: "Invalid email" }];
    const error = new AppError("Validation failed", 400, customErrors);

    expect(error.statusCode).toBe(400);
    expect(error.errors).toEqual(customErrors);
  });
});
