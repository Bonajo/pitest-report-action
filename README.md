# Pitest Report

A GitHub Action to publish the results from [Pitest](https://pitest.org/).

This action parses the `mutations.{xml,csv}` and publishes the results as annotations.

## Usage

Add the Action to the workflow, basic example can be found below.
See [Releases](https://github.com/Bonajo/pitest-report-action/releases) for the latest version.

```yaml
- name: Publish Pitest Report
  uses: Bonajo/pitest-report-action@v1.2.0
  with:
    file: target/pit-reports/mutations.xml
```

## Inputs

The Action has support for the following inputs:
```yaml
name:
  description: Name of the check run
  required: false
  default: Pitest report
file:
  description: Pitest report file (either XML or CSV)
  required: false
  default: '**/pit-reports/mutations.xml'
summary:
  description: Publish a summary as part of the workflow
  required: false
  default: true
annotation-types:
  description: Which type of mutations to generate annotations for (ALL, SURVIVED, KILLED)
  required: false
  default: SURVIVED
output:
  description: Output location of the annotations (checks, workflow)
  required: false
  default: checks
threshold:
  description: Fail if the test strength (0 to 100) is below the threshold
  required: false
  default: '0'
max-annotations:
  description: Limit the number of annotations that are generated (1 to 50)
  required: false
  default: 10
token:
  description: GitHub Access Token (see permissions)
  required: false
  default: ${{ github.token }}
```

## Outputs

The action has the following outputs on successful run:
```yaml
killed:
  description: Total number of killed mutations (including timed out, memory error, run error and non viable)
survived:
  description: Total number of survived mutations
no-coverage:
  description: Total number of mutations without test coverage
```

## Annotations

Annotations are placed on the source file of the mutated class, so they show up next to the code in pull requests.
Pitest only reports the class name and the name of the source file, so the action looks for a file tracked by git in the
directory of the package, e.g. `com.example.Calculator` in `Calculator.java` is found at
`src/main/java/com/example/Calculator.java`. This works for any source root and language (Java, Kotlin, ...).
In a multi-module project with the same class in several modules, the file in the module of the report is used.

The repository has to be checked out (e.g. with `actions/checkout`) for this to work. When the source file is not
found, the class name is used as path: the annotation is still shown in the check run and the workflow summary, but not
next to the code.

## Mutation statuses

The statuses reported by Pitest are counted the same way as Pitest does:

| Status | Counted as | `annotation-types` |
| --- | --- | --- |
| `KILLED`, `TIMED_OUT`, `MEMORY_ERROR`, `RUN_ERROR`, `NON_VIABLE` | killed | `KILLED` |
| `SURVIVED`, `NOT_STARTED`, `STARTED` | survived | `SURVIVED` |
| `NO_COVERAGE` | no coverage | `SURVIVED` |

The test strength used for the `threshold` is the percentage of killed mutations out of all mutations with coverage,
so mutations without coverage are not included.

## Permissions

To create the checks run the Action needs `write` permission for `checks`. 
This can be achieved by adding a permissions section to the workflow.

```yaml
permissions:
  checks: write
```

## Releases

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/). Pull requests are squash merged, so the PR title becomes the commit on `main` and must follow [Conventional Commits](https://www.conventionalcommits.org/) (checked on every PR):

| PR title | Release |
|----------|---------|
| `fix: ...`, `perf: ...` | patch (1.2.3 → 1.2.4) |
| `feat: ...` | minor (1.2.3 → 1.3.0) |
| `!` after the type (e.g. `feat!: ...`, `refactor!: ...`) or a `BREAKING CHANGE:` footer | major (1.2.3 → 2.0.0) |
| `docs:`, `chore:`, `ci:`, `build:`, `refactor:`, `test:`, `style:`, `revert:` | no release |

On every merge to `main` the next version is determined, tagged (`vX.Y.Z`) and a GitHub release is created. The bundled action in `dist/` is committed and checked in CI, so the tag is the release. The version in `package.json` is not the released version.

Dependabot uses `fix(deps)` for runtime dependencies, because they are bundled into `dist/` and only reach users through a release, and `build(deps-dev)` for development dependencies, which are not released.
