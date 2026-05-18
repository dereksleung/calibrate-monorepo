# Issue tracker: Local Markdown

Issues, PRDs, and implementation planning artifacts for this repo live as markdown files in `docs/tasks/`.

## Conventions

- One feature per directory: `docs/tasks/<feature-slug>/`
- The PRD is `docs/tasks/<feature-slug>/PRD.md`
- Individual implementation issues are `docs/tasks/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Grouped implementation task plans may also live under `docs/tasks/<feature-slug>/`. These plans can contain many related implementation tasks plus dependency information between those tasks.
- Matt Pocock triage state is recorded as a `Status for Matt Pocock skills:` line near the top of each Matt Pocock issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading when the artifact is an issue-style task

## When a skill says "publish to the issue tracker"

Create a new file under `docs/tasks/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
