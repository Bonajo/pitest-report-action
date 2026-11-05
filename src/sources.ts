import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as core from "@actions/core";
import { Mutation } from "./report.js";

const execFileAsync = promisify(execFile);

/**
 * List the files tracked by git, relative to the root of the repository.
 * Annotations can only be shown on files in the repository, so untracked files (e.g. build output) are not needed.
 * @param cwd directory inside the repository
 * @returns Promise<string[]> the tracked files, empty if git is not available or cwd is not a git repository
 */
export async function listRepositoryFiles(cwd: string = process.cwd()): Promise<string[]> {
    try {
        // ":/" lists the whole repository, also when cwd is a subdirectory
        const { stdout } = await execFileAsync("git", ["ls-files", "-z", "--full-name", "--", ":/"], {
            cwd,
            maxBuffer: 256 * 1024 * 1024
        });
        return stdout.split("\0").filter(file => file.length > 0);
    } catch (error) {
        core.warning(`Unable to list the repository files with git, annotations will use the class name as path. ` +
            `Make sure the repository is checked out. Error: ${(error as Error).message}`);
        return [];
    }
}

/**
 * Finds the source file of a mutation in the repository.
 * Pitest only reports the class name and the file name of the source file, the path is derived from the package
 * (e.g. com.example.Calculator in Calculator.java -> **\/com/example/Calculator.java).
 */
export class SourceResolver {
    private readonly filesByName = new Map<string, string[]>();

    /**
     * @param files paths relative to the repository root, using / as separator (as returned by listRepositoryFiles)
     */
    public constructor(files: string[]) {
        for (const file of files) {
            const name = file.substring(file.lastIndexOf("/") + 1);
            const sameName = this.filesByName.get(name) ?? [];
            sameName.push(file);
            this.filesByName.set(name, sameName);
        }
    }

    /**
     * Find the source file of the mutation
     * @param mutation the mutation to find the source file for
     * @param reportPath path of the report the mutation is from, used to pick the file in the same module when
     *                   multiple files match (e.g. the same class in multiple Maven modules)
     * @returns string | undefined path relative to the repository root, undefined if no file matches
     */
    public resolve(mutation: Mutation, reportPath: string = ""): string | undefined {
        if (!mutation.sourceFile) {
            return undefined;
        }
        // Inner classes (Outer$Inner) are in the source file of the outer class, so only the package is needed
        const lastDot = mutation.mutatedClass.lastIndexOf(".");
        const packagePath = lastDot === -1 ? "" : mutation.mutatedClass.substring(0, lastDot).replace(/\./g, "/") + "/";
        const suffix = packagePath + mutation.sourceFile;

        const candidates = (this.filesByName.get(mutation.sourceFile) ?? [])
            .filter(file => file === suffix || file.endsWith("/" + suffix));
        if (candidates.length <= 1) {
            return candidates[0];
        }

        const reportSegments = reportPath.replace(/\\/g, "/").split("/");
        return candidates
            .map(file => ({ file, shared: sharedSegments(file.split("/"), reportSegments) }))
            .sort((a, b) => b.shared - a.shared || a.file.localeCompare(b.file))[0]
            .file;
    }
}

/**
 * Number of leading path segments two paths have in common
 */
function sharedSegments(a: string[], b: string[]): number {
    let shared = 0;
    while (shared < a.length && shared < b.length && a[shared] === b[shared]) {
        shared++;
    }
    return shared;
}
