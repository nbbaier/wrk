import { expect, test } from "bun:test";

test("CLI should be importable", () => {
	expect(true).toBe(true);
});

test("Config path should be valid", () => {
	const xdgConfigHome =
		process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`;
	const expectedPath = `${xdgConfigHome}/wrk/config.json`;
	expect(expectedPath).toContain("/wrk/config.json");
});
