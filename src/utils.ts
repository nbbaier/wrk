import { homedir } from "node:os";

export function expandHomePath(path: string): string {
	if (path.startsWith("~")) {
		return path.replace(/^~/, homedir());
	}
	return path;
}

export function getTimeAgo(date: Date): string {
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

export function getConfigPath(): string {
	const configHome =
		process.env.WRK_CONFIG_HOME ||
		process.env.XDG_CONFIG_HOME ||
		`${process.env.HOME}/.config`;
	return `${configHome}/wrk/config.json`;
}
