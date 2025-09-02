#!/usr/bin/env bun

import { readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { type Command, parseCommand } from "./command-router.js";
import { expandHomePath, getConfigPath, getTimeAgo } from "./utils.js";

interface Config {
	workspace: string;
	ide: string;
	lastProjectPath?: string;
}

interface ProjectInfo {
	name: string;
	path: string;
	lastAccessed: Date;
}

class WrkCLI {
	private config: Config;
	private configPath: string;
	private exitCode = 0;

	constructor() {
		this.configPath = getConfigPath();
		this.config = { workspace: "", ide: "cursor", lastProjectPath: undefined };
	}

	private async initialize(): Promise<void> {
		this.config = await this.loadConfig();
	}

	private async loadConfig(): Promise<Config> {
		try {
			const configFile = Bun.file(this.configPath);
			if (await configFile.exists()) {
				const content = await configFile.text();
				return JSON.parse(content);
			}
		} catch (error) {
			console.error("Error loading config:", error);
		}

		return await this.createDefaultConfig();
	}

	private async createDefaultConfig(): Promise<Config> {
		console.log("Welcome to wrk! Let's set up your configuration.");

		const { default: inquirer } = await import("inquirer");

		const { workspace } = await inquirer.prompt([
			{
				type: "input",
				name: "workspace",
				message: "Enter your workspace directory path:",
				default: process.env.WORKSPACE || join(process.env.HOME || "", "workspace"),
				validate: (input: string) => {
					if (!input.trim()) {
						return "Workspace path cannot be empty";
					}
					return true;
				},
			},
		]);

		const { ide } = await inquirer.prompt([
			{
				type: "input",
				name: "ide",
				message: "Enter your preferred IDE command:",
				default: "cursor",
				validate: (input: string) => {
					if (!input.trim()) {
						return "IDE command cannot be empty";
					}
					return true;
				},
			},
		]);

		const config: Config = {
			workspace: workspace.trim(),
			ide: ide.trim(),
			lastProjectPath: undefined,
		};

		await this.saveConfig(config);
		console.log(`Created config at ${this.configPath}`);
		console.log(`Workspace set to: ${config.workspace}`);
		console.log(`IDE set to: ${config.ide}`);

		return config;
	}

	private async saveConfig(config: Config): Promise<void> {
		try {
			await Bun.$`mkdir -p ${dirname(this.configPath)}`;

			const configFile = Bun.file(this.configPath);
			await Bun.write(configFile, JSON.stringify(config, null, 2));
		} catch (error) {
			console.error("Error saving config:", error);
		}
	}

	private async updateLastProjectPath(projectPath: string): Promise<void> {
		this.config.lastProjectPath = projectPath;
		await this.saveConfig(this.config);
	}

	private getVersion(): string {
		try {
			const packageJson = require("../package.json");
			return packageJson.version;
		} catch (_error) {
			return "unknown";
		}
	}

	private async validateIdeBinary(ideCommand: string): Promise<string> {
		try {
			// Try to resolve the command path
			const { stdout } = await Bun.$`which ${ideCommand}`.quiet();
			const resolvedPath = stdout.toString().trim();
			if (resolvedPath) {
				return resolvedPath;
			}
		} catch (_error) {
			// Try to find it in common locations or as an absolute path
			const expandedIde = expandHomePath(ideCommand);
			try {
				await stat(expandedIde);
				return expandedIde;
			} catch (_error) {
				// IDE binary not found
			}
		}

		throw new Error(
			`IDE command '${ideCommand}' not found. Please install it or run 'wrk config --set ide=<your-ide>' to set a different IDE.`,
		);
	}

	private getWorkspacePath(workspaceName: string): string {
		const expandedWorkspace = resolve(expandHomePath(this.config.workspace));
		return join(expandedWorkspace, `${workspaceName}-work`);
	}

	private async listWorkspaces(): Promise<string[]> {
		const workspaces: string[] = [];

		try {
			const workspacePath = resolve(expandHomePath(this.config.workspace));
			const entries = await readdir(workspacePath, {
				withFileTypes: true,
			});

			for (const entry of entries) {
				if (entry.isDirectory() && entry.name.endsWith("-work")) {
					const workspaceName = entry.name.replace("-work", "");
					workspaces.push(workspaceName);
				}
			}
		} catch (_error) {
			return [];
		}

		return workspaces.sort();
	}

	private async listProjectsInWorkspace(
		workspaceName: string,
	): Promise<ProjectInfo[]> {
		const workspacePath = this.getWorkspacePath(workspaceName);
		const projects: ProjectInfo[] = [];

		try {
			const entries = await readdir(workspacePath, {
				withFileTypes: true,
			});

			const statPromises = entries
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => {
					const projectPath = join(workspacePath, entry.name);
					try {
						const stats = await stat(projectPath);
						return {
							name: entry.name,
							path: projectPath,
							lastAccessed: stats.mtime,
						};
					} catch (_error) {
						// Skip entries that can't be stat'd
						return null;
					}
				});

			const results = await Promise.allSettled(statPromises);

			for (const result of results) {
				if (result.status === "fulfilled" && result.value) {
					projects.push(result.value);
				}
			}
		} catch (_error) {
			return [];
		}

		return projects.sort(
			(a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime(),
		);
	}

	private async openProject(
		projectPath: string,
		flags?: Command["flags"],
	): Promise<void> {
		try {
			const stats = await stat(projectPath);
			if (!stats.isDirectory()) {
				console.error(`Project not found at ${projectPath}`);
				this.exitCode = 1;
				return;
			}
		} catch (_error) {
			console.error(`Project not found at ${projectPath}`);
			this.exitCode = 1;
			return;
		}

		// Handle dry-run
		if (flags?.dryRun) {
			console.log(`Would open project: ${projectPath}`);
			const ideToUse = flags.ide || this.config.ide;
			console.log(`Would use IDE: ${ideToUse}`);
			return;
		}

		try {
			await this.updateLastProjectPath(projectPath);
			const ideToUse = flags?.ide || this.config.ide;
			const validatedIde = await this.validateIdeBinary(ideToUse);

			// Use safe spawning to prevent command injection
			const process = Bun.spawn([validatedIde, projectPath], {
				stdout: "inherit",
				stderr: "inherit",
				stdin: "inherit",
			});

			const exitCode = await process.exited;
			if (exitCode !== 0) {
				console.error(`IDE exited with code ${exitCode}`);
				this.exitCode = exitCode;
				return;
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(error.message);
			} else {
				const ideToUse = flags?.ide || this.config.ide;
				console.error(`Error opening project with ${ideToUse}:`, error);
			}
			this.exitCode = 1;
			return;
		}
	}

	private async selectProjectFromList(
		projects: ProjectInfo[],
	): Promise<string> {
		if (projects.length === 0) {
			throw new Error("No projects available");
		}

		const { default: inquirer } = await import("inquirer");

		const choices = projects.map((project) => ({
			name: `${project.name} (${getTimeAgo(project.lastAccessed)})`,
			value: project.path,
		}));

		const { selectedProject } = await inquirer.prompt([
			{
				type: "list",
				name: "selectedProject",
				message: "Select a project:",
				choices,
			},
		]);

		return selectedProject;
	}

	private async promptForProjectName(workspaceName: string): Promise<string> {
		const { default: inquirer } = await import("inquirer");

		const { projectName } = await inquirer.prompt([
			{
				type: "input",
				name: "projectName",
				message: `Enter project name for ${workspaceName}:`,
				validate: (input: string) => {
					if (!input.trim()) {
						return "Project name cannot be empty";
					}

					return true;
				},
			},
		]);

		return projectName.trim();
	}

	private async ensureWorkspaceExists(workspaceName: string): Promise<void> {
		const workspacePath = this.getWorkspacePath(workspaceName);

		try {
			const stats = await stat(workspacePath);
			if (!stats.isDirectory()) {
				throw new Error("Not a directory");
			}
		} catch (_error) {
			const { default: inquirer } = await import("inquirer");

			const { shouldCreate } = await inquirer.prompt([
				{
					type: "confirm",
					name: "shouldCreate",
					message: `Workspace '${workspaceName}' not found. Create it?`,
					default: true,
				},
			]);

			if (shouldCreate) {
				await Bun.$`mkdir -p ${workspacePath}`;
				console.log(`Created workspace '${workspaceName}' at ${workspacePath}`);
			} else {
				this.exitCode = 0;
				return;
			}
		}
	}

	private async createProjectInWorkspace(workspaceName: string): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projectName = await this.promptForProjectName(workspaceName);
		const projectPath = join(this.getWorkspacePath(workspaceName), projectName);

		try {
			await stat(projectPath);
			console.error(
				`Project '${projectName}' already exists in ${workspaceName}`,
			);
			this.exitCode = 1;
			return;
		} catch (_error) {
			// Project doesn't exist, continue with creation
		}

		try {
			await Bun.$`mkdir -p ${projectPath}`;
			console.log(`Created project '${projectName}' at ${projectPath}`);
			await this.openProject(projectPath);
		} catch (error) {
			console.error("Error creating project:", error);
			this.exitCode = 1;
			return;
		}
	}

	private async openLastProject(): Promise<void> {
		if (!this.config.lastProjectPath) {
			console.log(
				"No last project found. Use 'wrk <workspace>' to open a project.",
			);
			return;
		}

		try {
			const stats = await stat(this.config.lastProjectPath);
			if (!stats.isDirectory()) {
				console.log(
					"Last project no longer exists. Use 'wrk <workspace>' to open a project.",
				);
				return;
			}
		} catch (_error) {
			console.log(
				"Last project no longer exists. Use 'wrk <workspace>' to open a project.",
			);
			return;
		}

		console.log(`Opening last project: ${this.config.lastProjectPath}`);
		await this.openProject(this.config.lastProjectPath);
	}

	private async listAllWorkspaces(): Promise<void> {
		const workspaces = await this.listWorkspaces();

		if (workspaces.length === 0) {
			console.log("No workspaces found.");
			const expandedWorkspace = expandHomePath(this.config.workspace);
			console.log(`Workspace directory: ${expandedWorkspace}`);
			return;
		}

		console.log("Available workspaces:");

		const countPromises = workspaces.map(async (workspace) => {
			const projectCount = (await this.listProjectsInWorkspace(workspace))
				.length;
			return { workspace, projectCount };
		});

		const results = await Promise.allSettled(countPromises);

		for (const result of results) {
			if (result.status === "fulfilled") {
				const { workspace, projectCount } = result.value;
				console.log(`  ${workspace} (${projectCount} projects)`);
			}
		}
	}

	private async openConfig(): Promise<void> {
		try {
			await stat(this.configPath);
		} catch (_error) {
			console.log("Config file does not exist. Run wrk to create it.");
			return;
		}

		try {
			const validatedIde = await this.validateIdeBinary(this.config.ide);

			// Use safe spawning to prevent command injection
			const process = Bun.spawn([validatedIde, this.configPath], {
				stdout: "inherit",
				stderr: "inherit",
				stdin: "inherit",
			});

			const exitCode = await process.exited;
			if (exitCode !== 0) {
				console.error(`IDE exited with code ${exitCode}`);
				this.exitCode = exitCode;
				return;
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(error.message);
			} else {
				console.error(`Error opening config with ${this.config.ide}:`, error);
			}
			this.exitCode = 1;
			return;
		}
	}

	private showHelp(): void {
		console.log(
			`
wrk - A minimal CLI for quickly opening projects in your IDE

USAGE:
    wrk [COMMAND] [ARGUMENTS] [FLAGS]

COMMANDS:
    (no command)        Open the last project you worked on
    <workspace>         Open a project from the specified workspace
    create <workspace> [project]  Create a new project in the specified workspace
    list [workspace]    List all available workspaces or projects in a workspace
    cd <workspace> <project>  Print the path to a project (for shell integration)
    config              Open the configuration file in your IDE for editing
    config --get <key>  Get a configuration value
    config --set <key>=<value>  Set a configuration value
    config --edit       Open the configuration file for editing
    --help, -h          Show this help message
    --version, -v       Show version information
    --config-path       Print the resolved config file path

FLAGS:
    --project, -p <name>    Open a specific project directly (no menu)
    --json                  Output in JSON format for scripting
    --dry-run               Preview actions without executing them
    --ide, -i <command>     Override IDE command for this invocation

EXAMPLES:
    wrk                                    # Open last project
    wrk client                             # Open a project from 'client' workspace
    wrk client --project myapp             # Open 'myapp' project directly
    wrk create client myapp                # Create 'myapp' project non-interactively
    wrk list                               # List all workspaces with project counts
    wrk list client                        # List projects in 'client' workspace
    wrk list client --json                 # List projects in JSON format
    wrk cd client myapp                    # Print path to 'client/myapp' project
    wrk config                             # Open config file for editing
    wrk config --get workspace             # Get current workspace path
    wrk config --set ide=vscode            # Set IDE to VS Code
    wrk config --edit                      # Open config file for editing
    wrk --version                          # Show version information
    wrk --config-path                      # Show config file location
    wrk client --dry-run                   # Preview what would be opened
    wrk client --ide vscode                # Open with VS Code instead of default IDE

CONFIGURATION:
    wrk uses a JSON config file located at:
    • $WRK_CONFIG_HOME/wrk/config.json (if WRK_CONFIG_HOME is set)
    • $XDG_CONFIG_HOME/wrk/config.json (if XDG_CONFIG_HOME is set)
    • ~/.config/wrk/config.json (default)

    Run 'wrk' without arguments to create your initial configuration.
			`.trim(),
		);
	}

	private async openWorkspace(
		workspaceName: string,
		flags?: Command["flags"],
	): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projects = await this.listProjectsInWorkspace(workspaceName);

		if (projects.length === 0) {
			if (flags?.project) {
				console.error(
					`No projects found in ${workspaceName}. Cannot open project '${flags.project}'.`,
				);
				this.exitCode = 1;
				return;
			}

			const { default: inquirer } = await import("inquirer");

			const { shouldCreate } = await inquirer.prompt([
				{
					type: "confirm",
					name: "shouldCreate",
					message: `No projects found in ${workspaceName}. Create a new project?`,
					default: true,
				},
			]);

			if (shouldCreate) {
				await this.createProjectInWorkspace(workspaceName);
			}
			return;
		}

		// If specific project requested via flag
		if (flags?.project) {
			const project = projects.find((p) => p.name === flags.project);
			if (project) {
				await this.openProject(project.path, flags);
			} else {
				console.error(
					`Project '${flags.project}' not found in ${workspaceName}.`,
				);
				console.error(
					`Available projects: ${projects.map((p) => p.name).join(", ")}`,
				);
				this.exitCode = 1;
			}
			return;
		}

		const selectedProjectPath = await this.selectProjectFromList(projects);
		await this.openProject(selectedProjectPath, flags);
	}

	private async listProjectsInWorkspaceWithFlags(
		workspaceName: string,
		flags?: Command["flags"],
	): Promise<void> {
		const projects = await this.listProjectsInWorkspace(workspaceName);

		if (flags?.json) {
			const jsonOutput = {
				workspace: workspaceName,
				projects: projects.map((p) => ({
					name: p.name,
					path: p.path,
					lastAccessed: p.lastAccessed.toISOString(),
				})),
			};
			console.log(JSON.stringify(jsonOutput, null, 2));
		} else {
			if (projects.length === 0) {
				console.log(`No projects found in ${workspaceName}`);
			} else {
				console.log(`Projects in ${workspaceName}:`);
				for (const project of projects) {
					console.log(
						`  ${project.name} (${getTimeAgo(project.lastAccessed)})`,
					);
				}
			}
		}
	}

	private async createProjectNonInteractive(
		workspaceName: string,
		projectName: string,
		flags?: Command["flags"],
	): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projectPath = join(this.getWorkspacePath(workspaceName), projectName);

		try {
			await stat(projectPath);
			console.error(
				`Project '${projectName}' already exists in ${workspaceName}`,
			);
			this.exitCode = 1;
			return;
		} catch (_error) {
			// Project doesn't exist, continue with creation
		}

		if (flags?.dryRun) {
			console.log(`Would create project: ${projectPath}`);
			return;
		}

		try {
			await Bun.$`mkdir -p ${projectPath}`;
			console.log(`Created project '${projectName}' at ${projectPath}`);
			await this.openProject(projectPath, flags);
		} catch (error) {
			console.error("Error creating project:", error);
			this.exitCode = 1;
			return;
		}
	}

	private async cdToProject(
		workspaceName: string,
		projectName: string,
		flags?: Command["flags"],
	): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projectPath = join(this.getWorkspacePath(workspaceName), projectName);

		try {
			const stats = await stat(projectPath);
			if (!stats.isDirectory()) {
				console.error(`Project '${projectName}' not found in ${workspaceName}`);
				this.exitCode = 1;
				return;
			}
		} catch (_error) {
			console.error(`Project '${projectName}' not found in ${workspaceName}`);
			this.exitCode = 1;
			return;
		}

		if (flags?.dryRun) {
			console.log(`Would cd to: ${projectPath}`);
			return;
		}

		// For cd command, we just print the path so the shell can use it
		// This is a common pattern for shell integration
		console.log(projectPath);
	}

	private showConfigPath(): void {
		console.log(this.configPath);
	}

	private async getConfigValue(key: string): Promise<void> {
		await this.initialize();

		const value = this.config[key as keyof Config];
		if (value === undefined) {
			console.error(`Config key '${key}' not found.`);
			console.error(`Available keys: ${Object.keys(this.config).join(", ")}`);
			this.exitCode = 1;
			return;
		}

		console.log(value);
	}

	private async setConfigValue(keyValue: string): Promise<void> {
		await this.initialize();

		const [key, ...valueParts] = keyValue.split("=");
		if (!key || valueParts.length === 0) {
			console.error("Usage: wrk config --set <key>=<value>");
			this.exitCode = 1;
			return;
		}

		const value = valueParts.join("=");

		// Validate the key
		if (!["workspace", "ide"].includes(key)) {
			console.error(
				`Invalid config key '${key}'. Available keys: workspace, ide`,
			);
			this.exitCode = 1;
			return;
		}

		// Validate the value
		if (!value.trim()) {
			console.error(`Value for '${key}' cannot be empty`);
			this.exitCode = 1;
			return;
		}

		// Update the config
		(this.config as any)[key] = value.trim();
		await this.saveConfig(this.config);

		console.log(`Updated ${key} to: ${value.trim()}`);
	}

	private async editConfig(): Promise<void> {
		await this.initialize();
		await this.openConfig();
	}

	async run(args: string[]): Promise<void> {
		try {
			const command = parseCommand(args);

			if (command.type === "help") {
				this.showHelp();
				return;
			}

			if (command.type === "version") {
				console.log(`wrk ${this.getVersion()}`);
				return;
			}

			if (command.type === "config-path") {
				this.showConfigPath();
				return;
			}

			await this.initialize();

			switch (command.type) {
				case "last":
					await this.openLastProject();
					break;
				case "config":
					if (command.flags?.get) {
						await this.getConfigValue(command.flags.get);
					} else if (command.flags?.set) {
						await this.setConfigValue(command.flags.set);
					} else if (command.flags?.edit) {
						await this.editConfig();
					} else {
						await this.openConfig();
					}
					break;
				case "list":
					if (command.workspaceName) {
						await this.listProjectsInWorkspaceWithFlags(
							command.workspaceName,
							command.flags,
						);
					} else {
						await this.listAllWorkspaces();
					}
					break;
				case "create":
					if (command.workspaceName) {
						if (command.projectName) {
							await this.createProjectNonInteractive(
								command.workspaceName,
								command.projectName,
								command.flags,
							);
						} else {
							await this.createProjectInWorkspace(command.workspaceName);
						}
					}
					break;
				case "cd":
					if (command.workspaceName && command.projectName) {
						await this.cdToProject(
							command.workspaceName,
							command.projectName,
							command.flags,
						);
					}
					break;
				case "workspace":
					if (command.workspaceName) {
						await this.openWorkspace(command.workspaceName, command.flags);
					}
					break;
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(error.message);
			} else {
				console.error("Unknown error:", error);
			}
			this.exitCode = 1;
		}

		// Set exit code if there was an error
		if (this.exitCode !== 0) {
			process.exitCode = this.exitCode;
		}
	}
}

const cli = new WrkCLI();
const args = process.argv.slice(2);
cli.run(args).catch(console.error);
