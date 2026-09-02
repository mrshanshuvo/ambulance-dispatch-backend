import type { Response } from "express";

export const sendSuccess = (
	res: Response,
	message: string,
	data: unknown,
	statusCode = 200,
) => res.status(statusCode).json({ success: true, message, data });

export const sendError = (
	res: Response,
	message: string,
	errors: unknown[] = [],
	statusCode = 400,
) => res.status(statusCode).json({ success: false, message, errors });
