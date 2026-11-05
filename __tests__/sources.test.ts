import {describe, expect, jest, test} from "@jest/globals";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {Mutation} from "../src/report.js";
import {createMutation} from "./helpers.js";

const core = {
    warning: jest.fn()
};
jest.unstable_mockModule('@actions/core', () => core);

const {listRepositoryFiles, SourceResolver} = await import("../src/sources.js");

const CALCULATOR = "__tests__/fixtures/project/src/main/java/com/example/Calculator.java";

describe('listRepositoryFiles', () => {
    test('lists the tracked files relative to the repository root', async () => {
        const files = await listRepositoryFiles();

        expect(files).toContain("package.json");
        expect(files).toContain(CALCULATOR);
        expect(files.some(file => file.startsWith("node_modules/"))).toBe(false);
        expect(core.warning).not.toHaveBeenCalled();
    });

    test('lists all files of the repository from a subdirectory', async () => {
        const files = await listRepositoryFiles(path.resolve("__tests__"));

        expect(files).toContain("package.json");
        expect(files).toContain(CALCULATOR);
    });

    test('returns no files and warns outside a git repository', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pitest-report-action-"));
        try {
            expect(await listRepositoryFiles(dir)).toEqual([]);
            expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Unable to list the repository files with git"));
        } finally {
            await fs.rm(dir, {recursive: true});
        }
    });
});

describe('SourceResolver', () => {
    function resolve(files: string[], mutation: Partial<Mutation>, reportPath?: string): string | undefined {
        return new SourceResolver(files).resolve(createMutation(mutation), reportPath);
    }

    test('finds the source file in the directory of the package', () => {
        const files = ["src/main/java/com/other/Calculator.java", "src/main/java/com/example/Calculator.java", "README.md"];

        expect(resolve(files, {mutatedClass: "com.example.Calculator", sourceFile: "Calculator.java"}))
            .toBe("src/main/java/com/example/Calculator.java");
    });

    test('returns undefined when no file is in the directory of the package', () => {
        const files = ["src/main/java/com/other/Calculator.java"];

        expect(resolve(files, {mutatedClass: "com.example.Calculator", sourceFile: "Calculator.java"})).toBeUndefined();
    });

    test('only matches complete directory names', () => {
        const files = ["src/main/java/xcom/example/Calculator.java"];

        expect(resolve(files, {mutatedClass: "com.example.Calculator", sourceFile: "Calculator.java"})).toBeUndefined();
    });

    test('finds the source file of an inner class', () => {
        const files = ["src/main/java/com/example/Calculator.java"];

        expect(resolve(files, {mutatedClass: "com.example.Calculator$Operation", sourceFile: "Calculator.java"}))
            .toBe("src/main/java/com/example/Calculator.java");
    });

    test('finds Kotlin source files', () => {
        const files = ["src/main/kotlin/com/example/Strings.kt"];

        expect(resolve(files, {mutatedClass: "com.example.StringsKt", sourceFile: "Strings.kt"}))
            .toBe("src/main/kotlin/com/example/Strings.kt");
    });

    test.each([
        ["src/main/java/Calculator.java"],
        ["Calculator.java"]
    ])('finds a class in the default package in %s', (file) => {
        expect(resolve([file], {mutatedClass: "Calculator", sourceFile: "Calculator.java"})).toBe(file);
    });

    test('returns undefined when the source file is unknown', () => {
        expect(resolve(["src/main/java/com/example/Calculator.java"], {sourceFile: ""})).toBeUndefined();
    });

    describe('multiple matching files', () => {
        const files = [
            "module-a/src/main/java/com/example/Calculator.java",
            "module-b/src/main/java/com/example/Calculator.java"
        ];
        const mutation = {mutatedClass: "com.example.Calculator", sourceFile: "Calculator.java"};

        test.each([
            ["module-b/target/pit-reports/mutations.xml"],
            ["module-b\\target\\pit-reports\\mutations.xml"]
        ])('picks the file in the module of the report %s', (reportPath) => {
            expect(resolve(files, mutation, reportPath)).toBe("module-b/src/main/java/com/example/Calculator.java");
        });

        test('picks the first file when the report is in none of the modules', () => {
            expect(resolve([...files].reverse(), mutation, "target/pit-reports/mutations.xml"))
                .toBe("module-a/src/main/java/com/example/Calculator.java");
        });
    });
});
