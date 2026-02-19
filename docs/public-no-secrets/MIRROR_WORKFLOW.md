# Optional: mirror public artifacts back into this repo (no secrets)

If you want this public repo to always contain the latest generated artifacts, do **not** query the DB from GitHub.
Instead, pull from a **public URL** where the product publishes the artifacts.

## Steps

1) Ensure the product publishes artifacts to a stable public URL, e.g.:

- `https://<host>/facts.json`
- `https://<host>/map.json`
- `https://<host>/map.md`
- `https://<host>/map.graphml`

2) Add `.github/workflows/mirror-public-artifacts.yml` using the template in this folder.

3) Set `MAP_BASE_URL` to the public host inside the workflow file (it’s not a secret).

This keeps GitHub secrets at zero.
