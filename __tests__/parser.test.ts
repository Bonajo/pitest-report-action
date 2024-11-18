import {getPaths, parseMutationReport, readFile} from '../src/parser';

import {expect, test} from '@jest/globals';

test('getPath should return valid path', async () => {
   const paths = await getPaths("mutations.xml");
   expect(paths.length).toBe(1);
   expect(paths[0]).toBe("mutations.xml");
});

test('readFile should read file', async () => {
   const data = await readFile('mutations.xml');
   const xml = data.startsWith("<?xml");
   expect(xml).toBeTruthy();
});

test('getPath unknown file should throw error', async () => {
   await expect(getPaths('test.xml')).rejects.toThrow("No matching file");
});

test('getPaths with multiple matched files', async () => {
   let paths = await getPaths("*.json");
   expect(paths).not.toBe(undefined);
   expect(paths.length).toBe(3);
});

test('getPath with non valid extension should throw', async () => {
   await expect(parseMutationReport("package.json")).rejects.toThrow("XML");
});

test('parseMutationReport should parse valid mutations.xml', async () => {
   const report = await parseMutationReport("mutations.xml");
   expect(report.mutations.length).toBe(11);
})

test('parseMutationReport should parse valid mutations.csv', async () => {
   const report = await parseMutationReport("mutations.csv");
   expect(report.mutations.length).toBe(11);
})