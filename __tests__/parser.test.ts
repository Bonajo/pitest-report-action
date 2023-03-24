import {getSourcePath, parseMutationReport, readFile} from '../src/parser';
import * as core from "@actions/core";

import {expect, test, jest} from '@jest/globals';

const data = `<?xml version="1.0" encoding="UTF-8"?><mutations><mutation detected='true' status='KILLED' numberOfTestsRun='4'><sourceFile>PGTableCreator.java</sourceFile><mutatedClass>io.github.fontysvenlo.tablegenerator.PGTableCreator</mutatedClass><mutatedMethod>processAnnotations</mutatedMethod><methodDescription>(Ljava/lang/String;Ljava/lang/reflect/Field;)Ljava/lang/String;</methodDescription><lineNumber>76</lineNumber><mutator>org.pitest.mutationtest.engine.gregor.mutators.NegateConditionalsMutator</mutator><indexes><index>37</index></indexes><blocks><block>4</block></blocks><killingTest>io.github.fontysvenlo.ddlgenerator.StudentTableGeneratorTest.[engine:junit-jupiter]/[class:io.github.fontysvenlo.ddlgenerator.StudentTableGeneratorTest]/[method:idGeneratesPrimaryKey()]</killingTest><description>negated conditional</description></mutation><mutation detected='true' status='KILLED' numberOfTestsRun='14'><sourceFile>PGTableCreator.java</sourceFile><mutatedClass>io.github.fontysvenlo.tablegenerator.PGTableCreator</mutatedClass><mutatedMethod>processAnnotations</mutatedMethod><methodDescription>(Ljava/lang/String;Ljava/lang/reflect/Field;)Ljava/lang/String;</methodDescription><lineNumber>77</lineNumber><mutator>org.pitest.mutationtest.engine.gregor.mutators.NegateConditionalsMutator</mutator><indexes><index>43</index></indexes><blocks><block>6</block></blocks><killingTest>io.github.fontysvenlo.ddlgenerator.ModuleTableGeneratorTest.[engine:junit-jupiter]/[class:io.github.fontysvenlo.ddlgenerator.ModuleTableGeneratorTest]/[test-template:columnDefs(java.lang.String,java.lang.String)]/[test-template-invocation:#1]</killingTest><description>negated conditional</description></mutation></mutations>`

test('readFile should read file', async () => {
   const data = await readFile('mutations.xml');
   const xml = data.startsWith("<?xml");
   expect(xml).toBeTruthy();
});

test('unknown file should throw error', async () => {
   await expect(readFile('test.xml')).rejects.toThrow("No matching file");
});

test('readFile with multiple matched files should warn', async () => {
   jest.spyOn(core, 'warning').mockImplementation(jest.fn())
   try{
      await readFile("*.json");
   }catch(ignored){  }
   expect(core.warning).toBeCalled();
});

test('readFile with non xml should throw', async () => {
   await expect(readFile('package.json')).rejects.toThrow("xml");
});

test('parseMutationReport should parse valid mutations.xml', async () => {
   const report = parseMutationReport(data);
   expect(report.mutations.mutation.length).toBe(2);
})

test('getSourcePath should give valid path', () => {
   const srcPath = getSourcePath("somedir/target/pit-reports/mutations.xml");
   expect(srcPath).toBe("somedir/src/main/java");
})

test('getSourcePath should throw when no target', () => {
   expect(() => getSourcePath("somedir/pit-reports/mutations.xml")).toThrow("src")
})