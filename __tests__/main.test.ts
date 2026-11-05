import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import {fixture} from './helpers.js';

// Inputs as defined in action.yml, overridden per test
const DEFAULT_INPUTS: Record<string, string> = {
    'name': 'Pitest report',
    'file': fixture('mutations.xml'),
    'summary': 'false',
    'annotation-types': 'SURVIVED',
    'output': 'checks',
    'max-annotations': '10',
    'threshold': '0',
    'token': 'test-token'
};
let inputs: Record<string, string> = {};

const summary = {
    addHeading: jest.fn((_text: string) => summary),
    addTable: jest.fn((_rows: unknown[]) => summary),
    write: jest.fn(async () => summary)
};

const core = {
    getInput: jest.fn((name: string) => inputs[name] ?? ''),
    getBooleanInput: jest.fn((name: string) => inputs[name] === 'true'),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    notice: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    summary
};

const CHECK_RUN_ID = 42;
const create = jest.fn(async (_params: object): Promise<unknown> => ({data: {id: CHECK_RUN_ID}}));
const update = jest.fn(async (_params: object): Promise<unknown> => ({url: 'https://api.github.com/check-runs/42'}));

const github = {
    getOctokit: jest.fn(() => ({rest: {checks: {create, update}}})),
    context: {
        repo: {owner: 'owner', repo: 'repo'},
        eventName: 'push',
        sha: 'abc123',
        payload: {}
    }
};

jest.unstable_mockModule('@actions/core', () => core);
jest.unstable_mockModule('@actions/github', () => github);

// Import after mocking, so main uses the mocked modules
const {run} = await import('../src/main.js');

/**
 * Run the action with the given inputs merged with the defaults
 */
async function runWith(overrides: Record<string, string> = {}): Promise<void> {
    inputs = {...DEFAULT_INPUTS, ...overrides};
    await run();
}

function outputs(): Record<string, unknown> {
    return Object.fromEntries(core.setOutput.mock.calls);
}

beforeEach(() => {
    create.mockImplementation(async () => ({data: {id: CHECK_RUN_ID}}));
});

describe('output: workflow', () => {
    test('adds annotations to the workflow run', async () => {
        await runWith({'output': 'workflow', 'annotation-types': 'ALL', 'max-annotations': '50'});

        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.notice).toHaveBeenCalledTimes(10);
        expect(core.warning).toHaveBeenCalledTimes(1);
        expect(core.warning).toHaveBeenCalledWith(
            "removed call to io.github.bonajo/tablegenerator/PGTableCreator::createTable",
            {
                title: "SURVIVED -> io.github.bonajo.tablegenerator.GeneratorMain:main",
                file: "io.github.bonajo.tablegenerator.GeneratorMain",
                startLine: 25
            });
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    test('respects max-annotations', async () => {
        await runWith({'output': 'workflow', 'annotation-types': 'ALL', 'max-annotations': '3'});

        expect(core.notice.mock.calls.length + core.warning.mock.calls.length).toBe(3);
    });
});

describe('output: checks', () => {
    test('creates and completes a check run', async () => {
        await runWith();

        expect(core.setFailed).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            owner: 'owner',
            repo: 'repo',
            name: 'Pitest report',
            head_sha: 'abc123',
            status: 'in_progress'
        }));
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            check_run_id: CHECK_RUN_ID,
            owner: 'owner',
            repo: 'repo',
            status: 'completed',
            conclusion: 'success',
            output: {
                title: 'Pitest report',
                summary: expect.stringContaining('| Total | 11 | 10 | 1 | 0 |'),
                annotations: [expect.objectContaining({
                    path: 'io.github.bonajo.tablegenerator.GeneratorMain',
                    start_line: 25,
                    end_line: 25,
                    annotation_level: 'warning'
                })]
            }
        }));
        expect(core.notice).not.toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
    });

    test('limits the annotations to max-annotations', async () => {
        await runWith({'annotation-types': 'ALL', 'max-annotations': '5'});

        const params = update.mock.calls[0][0] as {output: {annotations: unknown[]}};
        expect(params.output.annotations).toHaveLength(5);
    });

    test('fails the check run when the report cannot be parsed', async () => {
        await runWith({'file': fixture('malformed.xml')});

        expect(create).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            check_run_id: CHECK_RUN_ID,
            status: 'completed',
            conclusion: 'failure',
            output: {
                title: 'Action failed',
                summary: expect.stringContaining('Invalid XML')
            }
        }));
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid XML'));
    });

    test('fails without updating when the check run cannot be created', async () => {
        create.mockImplementation(async () => { throw new Error('Resource not accessible by integration'); });

        await runWith();

        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
        expect(update).not.toHaveBeenCalled();
    });

    test('handles errors that are not an Error instance', async () => {
        create.mockImplementation(async () => { throw 'unexpected failure'; });

        await runWith();

        expect(core.setFailed).toHaveBeenCalledWith('unexpected failure');
    });
});

describe('annotation paths', () => {
    const CALCULATOR = '__tests__/fixtures/project/src/main/java/com/example/Calculator.java';
    const LOOP = '__tests__/fixtures/project/src/main/java/com/example/Loop.java';

    test('places workflow annotations on the source files in the repository', async () => {
        await runWith({'file': fixture('statuses.xml'), 'output': 'workflow', 'annotation-types': 'ALL'});

        expect(core.warning).toHaveBeenCalledWith('survived mutation', {
            title: 'SURVIVED -> com.example.Calculator:subtract',
            file: CALCULATOR,
            startLine: 15
        });
        expect(core.notice).toHaveBeenCalledWith('timed_out mutation', expect.objectContaining({file: LOOP, startLine: 5}));
    });

    test('places check run annotations on the source files in the repository', async () => {
        await runWith({'file': fixture('statuses.csv'), 'annotation-types': 'SURVIVED'});

        const params = update.mock.calls[0][0] as {output: {annotations: {path: string, start_line: number}[]}};
        expect(params.output.annotations.map(a => [a.path, a.start_line])).toEqual([[CALCULATOR, 15], [CALCULATOR, 20]]);
    });

    test('uses the class name when the source file is not in the repository', async () => {
        await runWith({'output': 'workflow'});

        expect(core.warning).toHaveBeenCalledWith(expect.any(String),
            expect.objectContaining({file: 'io.github.bonajo.tablegenerator.GeneratorMain'}));
        expect(core.info).toHaveBeenCalledWith(
            'Source file of io.github.bonajo.tablegenerator.GeneratorMain not found in the repository, using the class name as path');
    });
});

describe('outputs and threshold', () => {
    test('sets the killed, survived and no-coverage outputs', async () => {
        await runWith({'file': fixture('statuses.xml'), 'output': 'workflow'});

        expect(outputs()).toEqual({'killed': 5, 'survived': 1, 'no-coverage': 1});
    });

    test.each([
        ['mutations.xml', '90', 'success'],
        ['mutations.xml', '91', 'failure'],
        // 5 detected out of 6 covered (NO_COVERAGE is excluded) = 83.3%
        ['statuses.xml', '83', 'success'],
        ['statuses.xml', '84', 'failure']
    ])('%s with threshold %s concludes with %s', async (file, threshold, conclusion) => {
        await runWith({'file': fixture(file), 'threshold': threshold});

        expect(update).toHaveBeenCalledWith(expect.objectContaining({conclusion}));
        if (conclusion === 'failure') {
            expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Threshold is not reached'));
        } else {
            expect(core.setFailed).not.toHaveBeenCalled();
        }
    });
});

describe('summary', () => {
    test('writes the job summary when enabled', async () => {
        await runWith({'summary': 'true'});

        expect(summary.addHeading).toHaveBeenCalledWith('Pitest results');
        expect(summary.addTable).toHaveBeenCalledTimes(1);
        expect(summary.write).toHaveBeenCalledTimes(1);
    });

    test('does not write the job summary when disabled', async () => {
        await runWith({'summary': 'false'});

        expect(summary.write).not.toHaveBeenCalled();
    });
});

describe('input validation', () => {
    test.each([
        ['annotation-types', 'FOO', 'Annotations should be one of ALL, KILLED or SURVIVED, but was FOO'],
        ['annotation-types', '', 'Annotations should be one of ALL, KILLED or SURVIVED, but was '],
        ['output', 'pr', "Output should either be 'checks' or 'workflow', but is pr"],
        ['max-annotations', '100', 'Max number of annotations should be a number between 1 and 50, but is 100'],
        ['max-annotations', '0', 'Max number of annotations should be a number between 1 and 50, but is 0'],
        ['max-annotations', 'abc', 'Max number of annotations should be a number between 1 and 50, but is abc'],
        ['threshold', 'abc', 'Threshold should be a number between 0 and 100, but is abc'],
        ['threshold', '101', 'Threshold should be a number between 0 and 100, but is 101']
    ])('%s "%s" fails before doing anything', async (input, value, message) => {
        await runWith({[input]: value});

        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(core.setFailed).toHaveBeenCalledWith(message);
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(core.setOutput).not.toHaveBeenCalled();
        expect(core.notice).not.toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
    });

    test('fails when no report file matches', async () => {
        await runWith({'file': 'does-not-exist.xml'});

        expect(core.setFailed).toHaveBeenCalledWith('No matching file found for does-not-exist.xml');
        expect(create).not.toHaveBeenCalled();
    });
});
