# Pitest Report

A GitHub Action to publish the results from [Pitest](https://pitest.org/).

This action parses the `mutations.{xml,csv}` and publishes the results as annotations.

## Usage

Add the Action to the workflow, basic example can be found below.

```yaml
- name: Publish Pitest Report
  uses: Bonajo/pitest-report-action@v1.0.0
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
