export function chunkArray<T>(array: readonly T[], chunkSize: number): readonly T[][] {
	if (chunkSize <= 0) {
		throw new Error("chunkSize must be a positive number");
	}
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		result.push(array.slice(i, i + chunkSize));
	}
	return result;
}