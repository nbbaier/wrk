export interface Command {
	type:
		| "help"
		| "version"
		| "config"
		| "list"
		| "create"
		| "workspace"
		| "last"
		| "cd"
		| "config-path";
	workspaceName?: string;
	projectName?: string;
	flags?: {
		project?: string;
		json?: boolean;
		dryRun?: boolean;
		ide?: string;
		get?: string;
		set?: string;
		edit?: boolean;
	};
}

export function parseCommand(args: string[]): Command {
	if (args.length === 0) {
		return { type: "last" };
	}

	// Check for global flags first
	if (args[0] === "--help" || args[0] === "-h") {
		return { type: "help" };
	}

	if (args[0] === "--version" || args[0] === "-v") {
		return { type: "version" };
	}

	if (args[0] === "--config-path") {
		return { type: "config-path" };
	}

	const command = args[0];
	const flags: Command["flags"] = {};
	let workspaceName: string | undefined;
	let projectName: string | undefined;

	// Parse flags
	for (let i = 1; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--json") {
			flags.json = true;
		} else if (arg === "--dry-run") {
			flags.dryRun = true;
		} else if (arg === "--project" || arg === "-p") {
			if (i + 1 >= args.length) {
				throw new Error("--project/-p requires a project name");
			}
			flags.project = args[++i];
		} else if (arg === "--ide" || arg === "-i") {
			if (i + 1 >= args.length) {
				throw new Error("--ide/-i requires an IDE command");
			}
			flags.ide = args[++i];
		} else if (!workspaceName) {
			workspaceName = arg;
		} else if (!projectName) {
			projectName = arg;
		}
	}

	// Handle commands
	if (command === "config") {
		// Parse config subcommands
		if (args[1] === "--get") {
			if (!args[2]) {
				throw new Error("Usage: wrk config --get <key>");
			}
			return { type: "config", flags: { ...flags, get: args[2] } };
		}
		if (args[1] === "--set") {
			if (!args[2]) {
				throw new Error("Usage: wrk config --set <key>=<value>");
			}
			return { type: "config", flags: { ...flags, set: args[2] } };
		}
		if (args[1] === "--edit") {
			return { type: "config", flags: { ...flags, edit: true } };
		}
		return { type: "config", flags };
	}

	if (command === "list") {
		return { type: "list", workspaceName, flags };
	}

	if (command === "create") {
		if (!workspaceName) {
			throw new Error("Usage: wrk create <workspace> [project]");
		}
		return { type: "create", workspaceName, projectName, flags };
	}

	if (command === "cd") {
		if (!workspaceName || !projectName) {
			throw new Error("Usage: wrk cd <workspace> <project>");
		}
		return { type: "cd", workspaceName, projectName, flags };
	}

	// Default: treat as workspace name
	return { type: "workspace", workspaceName: command, flags };
}
