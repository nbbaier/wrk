import { Command as CommanderCommand } from 'commander';

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
	// Handle special cases first
	if (args.length === 0) {
		return { type: "last" };
	}
	
	if (args[0] === "--help" || args[0] === "-h") {
		return { type: "help" };
	}
	
	if (args[0] === "--version" || args[0] === "-v") {
		return { type: "version" };
	}
	
	if (args[0] === "--config-path") {
		return { type: "config-path" };
	}
	
	const firstArg = args[0];
	
	// Check if first argument is a known command
	const knownCommands = ['config', 'list', 'create', 'cd'];
	const isKnownCommand = knownCommands.includes(firstArg);
	
	if (isKnownCommand) {
		// Use commander for known commands
		const program = new CommanderCommand();
		
		program
			.name('wrk')
			.description('A minimal CLI for quickly opening projects in your IDE')
			.version('1.0.0')
			.exitOverride(); // Prevent process.exit() calls
		
		let parsedCommand: Command | null = null;
		
		// Config command
		program
			.command('config')
			.description('Open the configuration file in your IDE for editing')
			.option('--get <key>', 'Get a configuration value')
			.option('--set <key=value>', 'Set a configuration value')
			.option('--edit', 'Open the configuration file for editing')
			.action((options) => {
				parsedCommand = {
					type: 'config',
					flags: {
						get: options.get,
						set: options.set,
						edit: options.edit,
					}
				};
			});
		
		// List command
		program
			.command('list')
			.argument('[workspace]', 'Workspace to list projects from')
			.description('List all available workspaces or projects in a workspace')
			.option('--json', 'Output in JSON format for scripting')
			.action((workspace, options) => {
				parsedCommand = {
					type: 'list',
					workspaceName: workspace,
					flags: {
						json: options.json,
					}
				};
			});
		
		// Create command
		program
			.command('create')
			.argument('<workspace>', 'Workspace name')
			.argument('[project]', 'Project name (optional)')
			.description('Create a new project in the specified workspace')
			.option('--dry-run', 'Preview actions without executing them')
			.option('-i, --ide <command>', 'Override IDE command for this invocation')
			.action((workspace, project, options) => {
				parsedCommand = {
					type: 'create',
					workspaceName: workspace,
					projectName: project,
					flags: {
						dryRun: options.dryRun,
						ide: options.ide,
					}
				};
			});
		
		// CD command
		program
			.command('cd')
			.argument('<workspace>', 'Workspace name')
			.argument('<project>', 'Project name')
			.description('Print the path to a project (for shell integration)')
			.option('--dry-run', 'Preview actions without executing them')
			.action((workspace, project, options) => {
				parsedCommand = {
					type: 'cd',
					workspaceName: workspace,
					projectName: project,
					flags: {
						dryRun: options.dryRun,
					}
				};
			});
		
		try {
			program.parse(args, { from: 'user' });
			
			if (parsedCommand) {
				return parsedCommand;
			}
			
			// Default to help if nothing matches
			return { type: "help" };
			
		} catch (error) {
			// Commander throws errors for invalid commands/options
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(`Command parsing failed: ${error}`);
		}
	} else {
		// Handle as workspace command - parse manually for better control
		const workspaceName = firstArg;
		const flags: Command["flags"] = {};
		
		// Parse remaining args for flags manually
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
			} else {
				// Unknown flag/argument - let it pass for now
			}
		}
		
		return {
			type: 'workspace',
			workspaceName,
			flags
		};
	}
}
