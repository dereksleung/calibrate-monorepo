# Manual backend image deployment

Status: specification approved by the user on 2026-10-27; implementation in progress.

## Objective

Let the administrator select an already-published Docker image and deploy it to
the existing production Droplet by manually running a GitHub Actions workflow.
There are no push, release, tag, schedule, or upstream-workflow deployment
triggers. Clicking **Run workflow** authorizes deployment directly; the user has
chosen not to add a separate GitHub Environment approval.

The repository is fixed to `dereksleung407/calibrate`. This workflow does not
build images, push images, create tags, or promote tags between environments.

## Image input

One required string input, `image`, accepts:

- A registry digest: `sha256:` followed by 64 lowercase hexadecimal characters.
- A bare 64-character lowercase registry digest, with the prefix supplied by
  the script.
- An exact semver tag: `1.2.3`, `v1.2.3`, or a prerelease such as
  `1.2.3-rc.1`. The supplied tag is used literally; the script does not add or
  remove `v`.
- A full reference in the fixed repository using one of those digests or tags.

Reject `latest`, moving aliases such as `stable`, incomplete versions, other
repositories, whitespace inside a reference, command arguments, and shell
syntax. Semver build metadata containing `+` is not supported because `+` is
not valid in a Docker tag. A registry digest is distinct from a Git commit SHA
or the local Docker image ID.

The workflow writes the selected input to `/home/deploy/incoming/image.txt`.
The root-owned script independently validates it. Semver tags are pulled once
under the existing deployment lock, resolved to a digest in the approved
repository, and pinned before migrations or production configuration changes.
All subsequent Compose operations, health verification, and `release.env`
recording use that digest. Unresolvable or ambiguous references fail without
recreating the backend.

## Configuration source

The existing production Action runs in a separate private GitHub repository
that contains `.env.production`. Preserve that arrangement: the private Action
uploads its own configuration and the selected `image.txt` before invoking the
root-owned script. The script continues to require both staged files. Do not
copy production configuration into this public repository or introduce another
configuration source.

## Workflow and access

- Use only `workflow_dispatch`, with a required string input and no default image.
- Serialize production deployments with one concurrency group and
  `cancel-in-progress: false`, covering upload and deployment together.
- Use the existing `deploy` account and no-argument sudo command:
  `sudo -n /usr/local/sbin/deploy-calibrate.mjs`.
- Preserve the existing restricted sudoers rule; do not grant Docker-group or
  general sudo access.
- Configure the SSH host, private key, and pinned known-hosts data through
  GitHub repository secrets/variables documented with the implementation.
- Pass workflow input through an environment variable and a data file, never
  interpolate it into shell source or the remote sudo command.
- Do not run the workflow, contact production, change GitHub settings, or push
  branches as part of this implementation.

## Project structure and style

Production files: `deployment/deploy-calibrate.mjs` and
`.github/workflows/deploy-calibrate.yml` in the private
`dereksleung/calibrate-config` repository. The existing workflow was inspected:
it already uses `workflow_dispatch`, concurrency group `calibrate-production`,
and secrets `DROPLET_SSH_PRIVATE_KEY`, `DROPLET_KNOWN_HOSTS`, and `DROPLET_HOST`.
Preserve its pinned checkout action, SSH options, and upload staging. Add the
manual input and stage/publish `image.txt` alongside `.env.production` before
invoking sudo.

Keep a workflow template under `deployment/github-actions/` in this public
repository; do not install a production workflow under its `.github/workflows/`.
Update `deployment/SSH_DEPLOY.md` for the manual run, input formats, setup, and
Droplet script replacement.

Use Node built-ins and the existing Docker CLI without adding dependencies.
Follow the existing dependency-injection style for tests:

```js
export function validateImage(contents) {
  const image = contents.toString("utf8").trim();
  // Normalize only approved reference forms; reject everything else.
  return image;
}
```

No changes to `apps/backend/`, application layers, or domain aggregates are needed.

## Testing strategy and commands

Use Node's built-in test runner in `deployment/tests/`, with command doubles for
Docker and temporary files for uploads and release metadata. Do not exercise the
production Droplet in tests.

```sh
node --test deployment/tests/deploy-calibrate.test.mjs
node --test --test-name-pattern='installed .mjs launcher' deployment/tests/deploy-calibrate-linux.test.mjs
visudo -cf deployment/deploy-calibrate.sudoers
git diff --check
```

Test accepted and rejected input forms, tag resolution and failures, immutable
pinning throughout deployment, and the chosen configuration behavior. Preserve
existing migration-failure and health-failure coverage. Validate workflow YAML
with already-installed tooling where available. Full Linux lock/FIFO checks
require Linux with Node 26.4.0 and `/usr/bin/flock`.

## Boundaries and acceptance

Always validate on the Droplet, retain the repository allowlist, keep secrets
out of logs, and fail before production changes when image selection fails.
Preserve migration-before-recreation ordering and PostgreSQL volume handling.

Ask before dependency installation, production actions, pushes, or destructive
operations. Never add an automatic deployment trigger or silently fall back to
`latest`.

Success means a manual digest or semver selection deploys the selected published
image using an immutable digest, with a documented configuration source and no
automatic production promotion.

## Sources

- [GitHub: manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
  describes `workflow_dispatch`, inputs, and the default-branch requirement for
  manual execution.
- [Docker: pulling by digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)
  explains pinning published images by digest rather than relying on a moving tag.
- [GitHub: script injection](https://docs.github.com/en/actions/concepts/security/script-injections)
  explains why user-controlled values must not be substituted into shell source.
