import {getPath, parseMutationReport, readFile} from '../src/parser';
import * as core from "@actions/core";

import {expect, test, jest} from '@jest/globals';

test('readFile should read file', async () => {
   const data = await readFile('mutations.xml');
   const xml = data.startsWith("<?xml");
   expect(xml).toBeTruthy();
});

test('getPath unknown file should throw error', async () => {
   await expect(getPath('test.xml')).rejects.toThrow("No matching file");
});

test('getPath with multiple matched files should warn', async () => {
   jest.spyOn(core, 'warning').mockImplementation(jest.fn())
   try{
      await getPath("*.json");
   }catch(ignored){  }
   expect(core.warning).toBeCalled();
});

test('getPath should work for valid file', async () => {
   const path = await getPath('mutations.xml');
   await expect(path).toBe("mutations.xml");
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
   console.log(report.mutations);
   expect(report.mutations.length).toBe(11);
})