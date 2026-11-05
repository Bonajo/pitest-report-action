import {describe, expect, test} from '@jest/globals';
import {getPaths, parseMutationReport, readFile} from '../src/parser.js';
import {fixture} from './helpers.js';

const ALL_STATUSES = ["KILLED", "SURVIVED", "NO_COVERAGE", "TIMED_OUT", "MEMORY_ERROR", "RUN_ERROR", "NON_VIABLE"];

describe('getPaths', () => {
   test('returns the matching file relative to the working directory', async () => {
      expect(await getPaths(fixture("mutations.xml"))).toEqual([fixture("mutations.xml")]);
   });

   test('returns every file matching a wildcard pattern', async () => {
      const paths = await getPaths(fixture("*.csv"));
      expect(paths.sort()).toEqual([
         fixture("empty.csv"),
         fixture("malformed.csv"),
         fixture("mutations.csv"),
         fixture("statuses.csv")
      ]);
   });

   test('supports globstar patterns', async () => {
      expect(await getPaths("**/fixtures/statuses.xml")).toEqual([fixture("statuses.xml")]);
   });

   test('throws when no file matches', async () => {
      await expect(getPaths('does-not-exist.xml')).rejects.toThrow("No matching file found for does-not-exist.xml");
   });
});

describe('readFile', () => {
   test('returns the file contents', async () => {
      const data = await readFile(fixture('mutations.xml'));
      expect(data.startsWith("<?xml")).toBe(true);
   });

   test('rejects when the file does not exist', async () => {
      await expect(readFile(fixture('does-not-exist.xml'))).rejects.toThrow("ENOENT");
   });
});

describe('parseMutationReport', () => {
   test.each([
      ["package.json", "'JSON'"],
      ["LICENSE", "''"]
   ])('rejects unsupported extension of %s', async (file, extension) => {
      await expect(parseMutationReport(file)).rejects.toThrow(`expected one of XML, CSV, but was ${extension}`);
   });

   test('rejects a missing file', async () => {
      await expect(parseMutationReport(fixture("does-not-exist.xml"))).rejects.toThrow("ENOENT");
   });

   test('report contains type and path', async () => {
      const report = await parseMutationReport(fixture("mutations.xml"));
      expect(report.type).toBe("XML");
      expect(report.path).toBe(fixture("mutations.xml"));
   });

   describe('XML', () => {
      test('parses all mutations', async () => {
         const report = await parseMutationReport(fixture("mutations.xml"));
         expect(report.mutations.length).toBe(11);
      });

      test('parses fields with the correct types', async () => {
         const report = await parseMutationReport(fixture("mutations.xml"));
         expect(report.mutations[0]).toEqual({
            sourceFile: "PGTableCreator.java",
            mutatedClass: "io.github.bonajo.tablegenerator.PGTableCreator",
            mutatedMethod: "processAnnotations",
            methodDescription: "(Ljava/lang/String;Ljava/lang/reflect/Field;)Ljava/lang/String;",
            lineNumber: 76,
            mutator: "org.pitest.mutationtest.engine.gregor.mutators.NegateConditionalsMutator",
            indexes: [{index: 37}],
            blocks: [{block: 4}],
            killingTest: "io.github.bonajo.ddlgenerator.StudentTableGeneratorTest.[engine:junit-jupiter]/[class:io.github.bonajo.ddlgenerator.StudentTableGeneratorTest]/[method:idGeneratesPrimaryKey()]",
            description: "negated conditional",
            attr_detected: true,
            attr_status: "KILLED",
            attr_numberOfTestsRun: 4
         });
      });

      test('a report with a single mutation is still parsed as an array', async () => {
         const report = await parseMutationReport(fixture("single.xml"));
         expect(report.mutations).toHaveLength(1);
         expect(report.mutations[0].attr_status).toBe("SURVIVED");
         expect(report.mutations[0].indexes).toEqual([{index: 3}]);
         expect(report.mutations[0].blocks).toEqual([{block: 0}]);
      });

      test('keeps every pitest status', async () => {
         const report = await parseMutationReport(fixture("statuses.xml"));
         expect(report.mutations.map(m => m.attr_status)).toEqual(ALL_STATUSES);
      });

      test('parses an empty report', async () => {
         const report = await parseMutationReport(fixture("empty.xml"));
         expect(report.mutations).toEqual([]);
      });

      test('rejects malformed XML', async () => {
         await expect(parseMutationReport(fixture("malformed.xml"))).rejects.toThrow("Invalid XML");
      });

      test('rejects XML that is not a pitest report', async () => {
         await expect(parseMutationReport(fixture("not-pitest.xml"))).rejects.toThrow("is not a pitest mutation report");
      });
   });

   describe('CSV', () => {
      test('parses all mutations', async () => {
         const report = await parseMutationReport(fixture("mutations.csv"));
         expect(report.type).toBe("CSV");
         expect(report.mutations.length).toBe(11);
      });

      test('maps the columns to mutation fields', async () => {
         const report = await parseMutationReport(fixture("statuses.csv"));
         expect(report.mutations[0]).toEqual({
            sourceFile: "Calculator.java",
            mutatedClass: "com.example.Calculator",
            mutator: "org.pitest.mutationtest.engine.gregor.mutators.MathMutator",
            mutatedMethod: "add",
            lineNumber: 10,
            attr_status: "KILLED",
            killingTest: "com.example.CalculatorTest.[method:add()]"
         });
      });

      test('killing test "none" is parsed as undefined', async () => {
         const report = await parseMutationReport(fixture("statuses.csv"));
         expect(report.mutations[1].attr_status).toBe("SURVIVED");
         expect(report.mutations[1].killingTest).toBeUndefined();
      });

      test('keeps every pitest status', async () => {
         const report = await parseMutationReport(fixture("statuses.csv"));
         expect(report.mutations.map(m => m.attr_status)).toEqual(ALL_STATUSES);
      });

      test('parses an empty report', async () => {
         const report = await parseMutationReport(fixture("empty.csv"));
         expect(report.mutations).toEqual([]);
      });

      test('rejects malformed CSV', async () => {
         await expect(parseMutationReport(fixture("malformed.csv"))).rejects.toThrow("Unable to parse CSV");
      });
   });
});
