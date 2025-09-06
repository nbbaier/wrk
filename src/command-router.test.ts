import { test, expect } from "bun:test";
import { parseCommand } from "./command-router.js";

test("parseCommand should handle no arguments (last command)", () => {
	const result = parseCommand([]);
	expect(result).toEqual({ type: "last" });
});

test("parseCommand should handle help flags", () => {
	expect(parseCommand(["--help"])).toEqual({ type: "help" });
	expect(parseCommand(["-h"])).toEqual({ type: "help" });
});

test("parseCommand should handle version flags", () => {
	expect(parseCommand(["--version"])).toEqual({ type: "version" });
	expect(parseCommand(["-v"])).toEqual({ type: "version" });
});

test("parseCommand should handle config-path flag", () => {
	const result = parseCommand(["--config-path"]);
	expect(result).toEqual({ type: "config-path" });
});

test("parseCommand should handle config command", () => {
	const result = parseCommand(["config"]);
	expect(result.type).toBe("config");
	expect(result.flags).toEqual({ get: undefined, set: undefined, edit: undefined });
});

test("parseCommand should handle config with --get flag", () => {
	const result = parseCommand(["config", "--get", "workspace"]);
	expect(result).toEqual({
		type: "config",
		flags: { get: "workspace", set: undefined, edit: undefined }
	});
});

test("parseCommand should handle config with --set flag", () => {
	const result = parseCommand(["config", "--set", "ide=vscode"]);
	expect(result).toEqual({
		type: "config",
		flags: { get: undefined, set: "ide=vscode", edit: undefined }
	});
});

test("parseCommand should handle config with --edit flag", () => {
	const result = parseCommand(["config", "--edit"]);
	expect(result).toEqual({
		type: "config",
		flags: { get: undefined, set: undefined, edit: true }
	});
});

test("parseCommand should handle list command without workspace", () => {
	const result = parseCommand(["list"]);
	expect(result).toEqual({
		type: "list",
		workspaceName: undefined,
		flags: { json: undefined }
	});
});

test("parseCommand should handle list command with workspace", () => {
	const result = parseCommand(["list", "client"]);
	expect(result).toEqual({
		type: "list",
		workspaceName: "client",
		flags: { json: undefined }
	});
});

test("parseCommand should handle list command with --json flag", () => {
	const result = parseCommand(["list", "client", "--json"]);
	expect(result).toEqual({
		type: "list",
		workspaceName: "client",
		flags: { json: true }
	});
});

test("parseCommand should handle create command", () => {
	const result = parseCommand(["create", "client"]);
	expect(result).toEqual({
		type: "create",
		workspaceName: "client",
		projectName: undefined,
		flags: { dryRun: undefined, ide: undefined }
	});
});

test("parseCommand should handle create command with project", () => {
	const result = parseCommand(["create", "client", "myapp"]);
	expect(result).toEqual({
		type: "create",
		workspaceName: "client",
		projectName: "myapp",
		flags: { dryRun: undefined, ide: undefined }
	});
});

test("parseCommand should handle create command with flags", () => {
	const result = parseCommand(["create", "client", "myapp", "--dry-run", "--ide", "vscode"]);
	expect(result).toEqual({
		type: "create",
		workspaceName: "client",
		projectName: "myapp",
		flags: { dryRun: true, ide: "vscode" }
	});
});

test("parseCommand should handle cd command", () => {
	const result = parseCommand(["cd", "client", "myapp"]);
	expect(result).toEqual({
		type: "cd",
		workspaceName: "client",
		projectName: "myapp",
		flags: { dryRun: undefined }
	});
});

test("parseCommand should handle cd command with --dry-run", () => {
	const result = parseCommand(["cd", "client", "myapp", "--dry-run"]);
	expect(result).toEqual({
		type: "cd",
		workspaceName: "client",
		projectName: "myapp",
		flags: { dryRun: true }
	});
});

test("parseCommand should handle workspace command", () => {
	const result = parseCommand(["client"]);
	expect(result).toEqual({
		type: "workspace",
		workspaceName: "client",
		flags: {}
	});
});

test("parseCommand should handle workspace command with --project flag", () => {
	const result = parseCommand(["client", "--project", "myapp"]);
	expect(result).toEqual({
		type: "workspace",
		workspaceName: "client",
		flags: { project: "myapp" }
	});
});

test("parseCommand should handle workspace command with short --project flag", () => {
	const result = parseCommand(["client", "-p", "myapp"]);
	expect(result).toEqual({
		type: "workspace",
		workspaceName: "client",
		flags: { project: "myapp" }
	});
});

test("parseCommand should handle workspace command with multiple flags", () => {
	const result = parseCommand(["client", "--project", "myapp", "--dry-run", "--ide", "vscode", "--json"]);
	expect(result).toEqual({
		type: "workspace",
		workspaceName: "client",
		flags: { project: "myapp", dryRun: true, ide: "vscode", json: true }
	});
});

test("parseCommand should handle workspace command with short ide flag", () => {
	const result = parseCommand(["client", "-i", "vscode"]);
	expect(result).toEqual({
		type: "workspace",
		workspaceName: "client",
		flags: { ide: "vscode" }
	});
});

test("parseCommand should throw error for --project without value", () => {
	expect(() => parseCommand(["client", "--project"])).toThrow("--project/-p requires a project name");
});

test("parseCommand should throw error for --ide without value", () => {
	expect(() => parseCommand(["client", "--ide"])).toThrow("--ide/-i requires an IDE command");
});