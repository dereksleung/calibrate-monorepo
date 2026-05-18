# Statuses for Matt Pocock skills

Matt Pocock skills speak in terms of five canonical triage roles. This file maps those roles to the actual status strings used in this repo's local markdown issue tracker.

Only consume or edit these statuses when using a skill that comes from Matt Pocock, as identified in each skill's `skills.md` file. Other skills may produce planning artifacts under `docs/tasks/` without using these statuses.

In Matt Pocock issue files, record this value in the `Status for Matt Pocock skills:` field.

| Label in mattpocock/skills | Status in our tracker | Meaning                                  |
| -------------------------- | --------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`        | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`          | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`     | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`     | Requires human implementation            |
| `wontfix`                  | `wontfix`             | Will not be actioned                     |

When a Matt Pocock skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding status string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
