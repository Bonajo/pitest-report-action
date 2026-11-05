import {afterEach, describe, expect, jest, test} from "@jest/globals";

const core = {
    info: jest.fn()
};
jest.unstable_mockModule('@actions/core', () => core);

// Import after mocking, the context object is shared with src/context.ts
const github = await import("@actions/github");
const {getCheckRunSha} = await import("../src/context.js");

const original = {
    eventName: github.context.eventName,
    sha: github.context.sha,
    payload: github.context.payload
};

function setContext(eventName: string, payload: object, sha: string = "context-sha"): void {
    github.context.eventName = eventName;
    github.context.payload = payload as typeof github.context.payload;
    github.context.sha = sha;
}

afterEach(() => {
    Object.assign(github.context, original);
});

describe('getCheckRunSha', () => {
    test('uses the head sha of the pull request', () => {
        setContext("pull_request", {pull_request: {number: 1, head: {sha: "pr-head-sha"}}});

        expect(getCheckRunSha()).toBe("pr-head-sha");
        expect(core.info).toHaveBeenCalledWith("Action triggered by pull request");
    });

    test('uses the head commit of the workflow run', () => {
        setContext("workflow_run", {workflow_run: {head_commit: {id: "run-head-sha"}}});

        expect(getCheckRunSha()).toBe("run-head-sha");
        expect(core.info).toHaveBeenCalledWith("Action triggered by workflow run");
    });

    test.each(["push", "workflow_dispatch", "schedule"])('uses the context sha for %s', (eventName) => {
        setContext(eventName, {});

        expect(getCheckRunSha()).toBe("context-sha");
    });

    test.each(["pull_request", "workflow_run"])('throws when the %s payload is missing', (eventName) => {
        setContext(eventName, {});

        expect(() => getCheckRunSha()).toThrow(`Event '${eventName}' is missing field '${eventName}'`);
    });
});
