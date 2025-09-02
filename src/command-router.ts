export interface Command {
	type:
		| "help"
		| "version"
		| "config"
		| "list"
		| "create"
		| "workspace"
		| "last";
	workspaceName?: string;
}

export function parseCommand(args: string[]): Command {
	const command = args[0];
	const workspaceName = args[1];

	if (command === "--help" || command === "-h") {
		return { type: "help" };
	}

	if (command === "--version" || command === "-v") {
		return { type: "version" };
	}

	if (!command) {
		return { type: "last" };
	}

	if (command === "config") {
		return { type: "config" };
	}

	if (command === "list") {
		return { type: "list" };
	}

	if (command === "create") {
		if (!workspaceName) {
			throw new Error("Usage: wrk create <workspace>");
		}
		return { type: "create", workspaceName };
	}

	return { type: "workspace", workspaceName: command };
}
