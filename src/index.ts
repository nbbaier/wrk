#!/usr/bin/env bun

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import inquirer from "inquirer";

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

	constructor() {
		this.configPath = this.getConfigPath();
		this.config = { workspace: "", ide: "cursor", lastProjectPath: undefined };
	}

	private async initialize(): Promise<void> {
		this.config = await this.loadConfig();
	}

	private getConfigPath(): string {
		const xdgConfigHome =
			process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`;
		return `${xdgConfigHome}/wrk/config.json`;
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
		const workspace = process.env.WORKSPACE || `${process.env.HOME}/workspace`;
		const config: Config = {
			workspace,
			ide: "cursor",
			lastProjectPath: undefined,
		};

		await this.saveConfig(config);
		console.log(`Created default config at ${this.configPath}`);
		console.log(`Workspace set to: ${workspace}`);
		console.log(`IDE set to: ${config.ide}`);

		return config;
	}

	private async saveConfig(config: Config): Promise<void> {
		try {
			const configDir = this.configPath.substring(
				0,
				this.configPath.lastIndexOf("/"),
			);
			await Bun.$`mkdir -p ${configDir}`;

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

	private getWorkspacePath(workspaceName: string): string {
		return `${this.config.workspace}/${workspaceName}-work`;
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

			for (const entry of entries) {
				if (entry.isDirectory()) {
					const projectPath = join(workspacePath, entry.name);
					const stats = await stat(projectPath);
					projects.push({
						name: entry.name,
						path: projectPath,
						lastAccessed: stats.mtime,
					});
				}
			}
		} catch (_error) {
			return [];
		}

		return projects.sort(
			(a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime(),
		);
	}

	private async openProject(projectPath: string): Promise<void> {
		const projectDir = Bun.file(projectPath);

		if (!(await projectDir.exists())) {
			console.error(`Project not found at ${projectPath}`);
			process.exit(1);
		}

		try {
			await this.updateLastProjectPath(projectPath);
			await Bun.$`${this.config.ide} ${projectPath}`;
		} catch (error) {
			console.error(`Error opening project with ${this.config.ide}:`, error);
			process.exit(1);
		}
	}

	private async selectProjectFromList(
		projects: ProjectInfo[],
	): Promise<string> {
		if (projects.length === 0) {
			throw new Error("No projects available");
		}

		const choices = projects.map((project) => ({
			name: `${project.name} (${this.getTimeAgo(project.lastAccessed)})`,
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
		const workspaceDir = Bun.file(workspacePath);

		if (!(await workspaceDir.exists())) {
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
				process.exit(0);
			}
		}
	}

	private async createProjectInWorkspace(workspaceName: string): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projectName = await this.promptForProjectName(workspaceName);
		const projectPath = join(this.getWorkspacePath(workspaceName), projectName);
		const projectDir = Bun.file(projectPath);

		if (await projectDir.exists()) {
			console.error(
				`Project '${projectName}' already exists in ${workspaceName}`,
			);
			process.exit(1);
		}

		try {
			await Bun.$`mkdir -p ${projectPath}`;
			console.log(`Created project '${projectName}' at ${projectPath}`);
			await this.openProject(projectPath);
		} catch (error) {
			console.error("Error creating project:", error);
			process.exit(1);
		}
	}

	private async openLastProject(): Promise<void> {
		if (!this.config.lastProjectPath) {
			console.log(
				"No last project found. Use 'wrk <workspace>' to open a project.",
			);
			return;
		}

		const lastProjectDir = Bun.file(this.config.lastProjectPath);
		if (!(await lastProjectDir.exists())) {
			console.log(
				"Last project no longer exists. Use 'wrk <workspace>' to open a project.",
			);
			return;
		}

		console.log(`Opening last project: ${this.config.lastProjectPath}`);
		await this.openProject(this.config.lastProjectPath);
	}

	private async openWorkspace(workspaceName: string): Promise<void> {
		await this.ensureWorkspaceExists(workspaceName);

		const projects = await this.listProjectsInWorkspace(workspaceName);

		if (projects.length === 0) {
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

		const selectedProjectPath = await this.selectProjectFromList(projects);
		await this.openProject(selectedProjectPath);
	}

	private getTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "today";
		} else if (diffDays === 1) {
			return "yesterday";
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	async run(args: string[]): Promise<void> {
		await this.initialize();

		const command = args[0];
		const workspaceName = args[1];

		if (!command) {
			await this.openLastProject();
		} else if (command === "create" && workspaceName) {
			await this.createProjectInWorkspace(workspaceName);
		} else if (command === "create") {
			console.log("Usage: wrk create <workspace>");
			process.exit(1);
		} else {
			await this.openWorkspace(command);
		}
	}
}

const cli = new WrkCLI();
const args = process.argv.slice(2);
cli.run(args).catch(console.error);
