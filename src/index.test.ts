import { expect, test } from "bun:test";
import { expandHomePath, getConfigPath, getTimeAgo } from "./utils.js";

test("CLI should be importable", () => {
	expect(true).toBe(true);
});

test("Config path should be valid", () => {
	const expectedPath = getConfigPath();
	expect(expectedPath).toContain("/wrk/config.json");
});

test("WRK_CONFIG_HOME should override config path", () => {
	const originalEnv = process.env.WRK_CONFIG_HOME;
	process.env.WRK_CONFIG_HOME = "/custom/config";

	const configPath = getConfigPath();
	expect(configPath).toBe("/custom/config/wrk/config.json");

	// Restore original environment
	if (originalEnv) {
		process.env.WRK_CONFIG_HOME = originalEnv;
	} else {
		delete process.env.WRK_CONFIG_HOME;
	}
});

test("expandHomePath should expand ~ to home directory", () => {
	const result = expandHomePath("~/test");
	expect(result).toContain("/test");
	expect(result).not.toContain("~");
});

test("expandHomePath should return path unchanged if no ~", () => {
	const result = expandHomePath("/absolute/path");
	expect(result).toBe("/absolute/path");
});

test("getTimeAgo should return correct time strings", () => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
	const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);

	expect(getTimeAgo(today)).toBe("today");
	expect(getTimeAgo(yesterday)).toBe("yesterday");
	expect(getTimeAgo(threeDaysAgo)).toBe("3 days ago");
	expect(getTimeAgo(tenDaysAgo)).toBe(tenDaysAgo.toLocaleDateString());
});
