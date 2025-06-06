# Issue Digest

![CI](https://github.com/sethrylan/issue-digest/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/sethrylan/issue-digest/actions/workflows/check-dist.yml/badge.svg)](https://github.com/sethrylan/issue-digest/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/sethrylan/issue-digest/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/sethrylan/issue-digest/actions/workflows/codeql-analysis.yml)

A GitHub Action that comments a list of issues. If a discussion with a match
`title` is found, that discussion is used, or a new discussion is created.

## Development

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

2. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

3. :white_check_mark: Run the tests

   ```bash
   npm test
   ```

4. :rocket: Build the action, rollup and run test.

   ```bash
   npm run all
   ```

## Usage

### Create a daily discussion (at 08:00 UTC), with a list of issues in the last 24 hours

```yaml
on:
  schedule:
    - cron: '0 8 * * *'

permissions:
  contents: read
  discussions: write
  issues: read

jobs:
  issue-digest:
    runs-on: ubuntu-latest
    steps:
      - uses: sethrylan/issue-digest@0eeb2ed746035642644fa2a92c7db1d89e5dc9fa
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Create a weekly discussion every Monday, and comment every day at 08:00 UTC with a list of updated issues

```yaml
on:
  schedule:
    - cron: '0 8 * * *'

permissions:
  contents: read
  discussions: write
  issues: read

jobs:
  issue-digest:
    runs-on: ubuntu-latest
    steps:
      - id: last
        run: |
          echo "monday=$(date -d 'last Monday' '+%Y-%m-%d')" >> "$GITHUB_OUTPUT"
      - uses: sethrylan/issue-digest@0eeb2ed746035642644fa2a92c7db1d89e5dc9fa
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          intro: |
            🤖 This discussion was created by issue-digest
            The title of the discussion will be create a new discussion each week, and every time the action runs a comment will be added with a list of issues changed in the last 24 hours.
          comment: |
            Issues updated in the last 24 hours
          title: |
            Issue Digest for Week of ${{ steps.last.outputs.monday }}
```

### Add Copilot summaries to the digest

```yaml
permissions:
  contents: read
  discussions: write
  issues: read
  models: read

jobs:
  issue-digest:
    runs-on: ubuntu-latest
    steps:
      - uses: sethrylan/issue-digest@0eeb2ed746035642644fa2a92c7db1d89e5dc9fa
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          models: true
          lookback: 4hr # optional, defeaults to 24hr; this can help to trim the context to recent changes
```

## Common Errors

### Error `Resource not accessible by integration`

Check the permissions for the calling workflow.

#### No Isuses are found

Check the permissions for the calling workflow.

### Discussion category (General) not found

Check that discussions are enabled for the repository.
