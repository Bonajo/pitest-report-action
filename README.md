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
  description: Fail if the test-strength is below the threshold
  required: false
  default: '0'
max-annotations:
  description: Limit the number of annotations that are generated (max 50)
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
  description: Total number of killed mutations
survived:
  description: Total number of survived mutations
```

## Permissions

To create the checks run the Action needs `write` permission for `checks`. 
This can be achieved by adding a permissions section to the workflow.

```yaml
permissions:
  checks: write
```
