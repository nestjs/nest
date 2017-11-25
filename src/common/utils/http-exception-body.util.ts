export const createHttpExceptionBody = (
	message: any,
	error: string,
	status: number,
) =>
	message
		? { statusCode: status, error, message }
		: { statusCode: status, error };
