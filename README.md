# Expense Tracker — DevSecOps Hands-on Lab

**Stack:** React/Vite + Nginx, Node.js/Express, MongoDB, Docker Compose, GitHub Actions, Trivy, Docker Hub, AWS EC2.

## Learning objectives

Students will build a pipeline that runs **lint + tests**, performs **Trivy Critical-only repository scanning**, builds frontend/backend images, performs **Trivy Critical-only image scanning**, pushes versioned images to Docker Hub, and deploys automatically to EC2. A failed required step blocks downstream jobs. Pull requests only run quality and repository scanning; only pushes to `main` publish and deploy.

> **Important:** Trivy detects known issues using its available databases and rules; a clean scan is not proof of security. HIGH/MEDIUM/LOW findings are not blocking. Scanner errors **are** blocking. A secret detection's severity behavior is scanner-defined; do not commit secrets regardless of the threshold. This training example uses Docker Hub credentials and SSH; use protected GitHub environments, least privilege and short-lived credentials where feasible.

## 1 — Requirements

- GitHub repository containing this project (default branch **main**).
- Docker Desktop locally, or Docker Engine + Docker Compose plugin.
- Node.js 22 and npm for local lint/tests.
- Docker Hub account; create repositories **expense-backend** and **expense-frontend** (public or private).
- AWS Ubuntu EC2 instance with a public IP/DNS and SSH key pair.
- Security group inbound **TCP 22** from trusted GitHub runner egress IPs or your managed runner; **TCP 80** from intended users. For a classroom demo with GitHub-hosted runners, IP allowlisting is challenging because runner IPs change; prefer a self-hosted runner or an approved secure access mechanism. Never leave SSH open to the world as a long-term solution.
- EC2 outbound internet access for Docker Hub pulls.

## 2 — Test locally before GitHub

From the project root:

```bash
cd backend
npm install
npm run lint
npm test
cd ../frontend
npm install
npm run lint
npm test
npm run build
cd ..
docker compose up -d --build
docker compose ps
curl -f http://localhost/api/health
```

Open **http://localhost**. MongoDB data is persisted in the `mongo-data` named volume. Stop without deleting the database using `docker compose down`. **Never use `docker compose down -v`** unless you intend to delete the database.

Note: The original ZIP has no `package-lock.json`. For repeatable CI, after `npm install` succeeds, **commit the generated `backend/package-lock.json` and `frontend/package-lock.json`**. The included workflow uses `npm install` so it works with the original ZIP; you can upgrade to `npm ci` after committing lockfiles.

## 3 — Create Docker Hub token

1. Sign in to Docker Hub → Account settings → Personal access tokens.
2. Generate a token with repository push permissions.
3. Create Docker Hub repositories `expense-backend` and `expense-frontend` under your account.
4. Store token in GitHub Actions secret `DOCKERHUB_TOKEN`. Do **not** put the token in YAML or commit it.

Images are tagged with the Git commit SHA, e.g. `YOURUSER/expense-backend:<commit-sha>`, avoiding mutable `latest` deployments.

## 4 — Prepare EC2 (Ubuntu)

1. Launch Ubuntu EC2 (for example t3.small or larger, depending on workload), with an SSH key pair. Note the public DNS/IP.
2. Configure inbound TCP 80 and narrowly controlled SSH TCP 22. Use HTTPS and a domain for production; this lab demonstrates HTTP only.
3. Connect from your computer:

```bash
chmod 400 ~/Downloads/your-ec2-key.pem
ssh -i ~/Downloads/your-ec2-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

4. Install Docker and ComposeV2.
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

Confirm:

```bash
docker --version
docker compose version
```

5. Allow your EC2 SSH user to run Docker (note: membership in the docker group is effectively root-equivalent):

```bash
sudo usermod -aG docker "$USER"
exit
```

Reconnect via SSH, then verify `docker ps` works without sudo. Create the deployment folder:

```bash
mkdir -p ~/expense-tracker
```

6. **Verify the server host key independently before trusting it.** On EC2, get the ED25519 fingerprint:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
```

The output contains a fingerprint such as `SHA256:...`. Copy only the **SHA256:...** string to the GitHub variable `EC2_HOST_FINGERPRINT`. Confirm your instance really uses the ED25519 SSH host key. The workflow retrieves the public host key using `ssh-keyscan` but **refuses to connect unless its fingerprint matches the trusted value**. Do not copy an unverified fingerprint from a network scan.

## 5 — Configure GitHub Actions variables and secrets

Repository → **Settings → Secrets and variables → Actions**.

| Name | GitHub type | Example / what to enter |
|---|---|---|
| `EC2_HOST` | Variable | `ec2-xx-xx-xx-xx.compute.amazonaws.com` or public IP |
| `EC2_USER` | Variable | `ubuntu` |
| `EC2_SSH_KEY` | Secret | **Complete PEM/OpenSSH private key contents**, including BEGIN/END lines |
| `EC2_HOST_FINGERPRINT` | Variable | Verified `SHA256:...` ED25519 host key fingerprint |
| `DOCKERHUB_USERNAME` | Variable | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Secret | Docker Hub personal access token |

To get the private key content locally, run `cat ~/Downloads/your-ec2-key.pem` and copy the entire output to the secret. **Never commit or share the key**. The public key is already authorized on EC2 by the EC2 key pair; you do **not** need a second authentication public key in GitHub. `EC2_HOST_FINGERPRINT` authenticates the **server**, whereas `EC2_SSH_KEY` authenticates the **client**.

In **Settings → Environments**, create `production` if you want environment protection rules. The deployment job uses that environment. If you add required reviewers, deployment waits for approval (no longer fully unattended).

## 6 — Push and observe pipeline

```bash
git init
git add .
git commit -m "Add Trivy CI/CD pipeline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If you already have a repository, do not reinitialize or re-add `origin`; simply commit and push.

Open **GitHub → Actions → Expense Tracker - CI Security CD**.

1. `quality`: backend/frontend lint, unit tests, frontend production build.
2. `trivy-repository`: scans the repository for Critical findings.
3. `image-build-scan-push`: builds both images, scans each for **CRITICAL** vulnerabilities, then logs into Docker Hub and pushes images **only if scans pass**.
4. `deploy`: checks the trusted EC2 fingerprint, copies `docker-compose.prod.yml`, authenticates Docker Hub, pulls the new commit-tagged images, starts containers, and checks `http://127.0.0.1/api/health` up to 30 times.

The pipeline blocks on any lint/test failure, any Critical Trivy finding, Docker build/push error, SSH failure, or failed deployment health check. Lower-severity vulnerability findings do not fail the scan. A post-deployment health-check failure means the new version may already be running; this lab **does not automatically roll back**.

## 7 — Verify EC2 deployment

```bash
ssh -i ~/Downloads/your-ec2-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd ~/expense-tracker
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/health
```

In your browser, open `http://YOUR_EC2_PUBLIC_IP`.

The frontend Nginx proxy routes `/api/` requests to the backend container using the Docker network. MongoDB is not exposed to the internet. The production Compose file uses images from Docker Hub and preserves the `mongo-data` volume across normal deployments.

## 8 — Classroom exercises

**Exercise A — Lint failure:** Add an undefined variable in `backend/src/server.js`, e.g. `console.log(notDefined);`, commit and push. Verify the `quality` job fails and nothing is deployed. Remove it and push again.

**Exercise B — Test failure:** Change `assert.equal(response.status, 200)` to `assert.equal(response.status, 201)` in `backend/tests/api.test.js`. Commit and push. Verify tests fail and deployment is blocked. Restore it.

**Exercise C — Trivy Critical finding:** In a **temporary training branch**, use a deliberately vulnerable dependency or test image with a **currently confirmed Critical CVE**. Run Trivy locally to verify the finding before pushing. Vulnerability database results change over time, so this guide does not hardcode an unreliable package version. Never deploy the vulnerable image. Verify the image scan exits nonzero and Docker Hub push is skipped; fix the vulnerability and repeat.

**Exercise D — Successful CD:** Change a visible frontend heading, commit to `main`, and verify the new image SHA appears on Docker Hub and EC2 serves the update.

## 9 — Troubleshooting

- **Trivy fails with database download/network errors:** This is a scanner failure, not a vulnerability result. Retry; do not bypass the gate.
- **SSH timeout:** Check EC2 is running, security group inbound 22, route/NACL and runner reachability.
- **Fingerprint mismatch:** Stop and independently verify the EC2 host ED25519 fingerprint. Do not disable StrictHostKeyChecking.
- **Permission denied (publickey):** Verify the EC2 username, authorized key, and full private key contents.
- **Docker permission denied:** Reconnect after `usermod -aG docker`; check `docker ps`.
- **Docker Hub pull denied:** Verify username/token, repositories, and Docker Hub permissions.
- **Health check fails:** Run `docker compose -f docker-compose.prod.yml logs --tail=100`; verify backend can reach MongoDB and frontend can reach backend.
- **Port 80 busy:** Stop the other web server or change the published port in `docker-compose.prod.yml` and health check accordingly.
- **GitHub workflow not triggered:** Check branch name is `main`, workflow is under `.github/workflows/`, and Actions are enabled.

## 10 — Security and production improvements

This is a learning deployment. For production: use TLS/HTTPS, restrict SSH via a trusted network or use a managed deployment method, protect the `production` environment, pin GitHub Actions to immutable commit hashes, pin container base images by digest, commit npm lockfiles and use `npm ci`, configure MongoDB authentication and backups, use least-privilege Docker Hub tokens, add integration tests and rollback, and consider an image registry with immutable tags. No OWASP Dependency-Check or SonarQube is included, as requested.


## ESLint `fetch is not defined` troubleshooting

Node.js 22 includes the global `fetch` API, but ESLint `no-undef` requires it to be declared as a global. Both backend and frontend ESLint configurations include `fetch: 'readonly'`. Do not disable the `no-undef` rule to solve this error.

Run from the project root:

```bash
cd backend && npm install && npm run lint && npm test
cd ../frontend && npm install && npm run lint && npm test && npm run build
```

If your local Node version is older, upgrade to Node.js 22 to match GitHub Actions.


## Backend test process exits automatically (fix)

The backend is now separated into `backend/src/app.js` (Express routes and middleware) and `backend/src/server.js` (MongoDB connection and port 5000 listener). Tests import `app.js` so they do **not** connect to MongoDB or start the production server. Each test opens a temporary listener on an ephemeral port and closes it in `finally`.

From `backend/`, run:

```bash
npm install
npm run lint
npm test
```

Expected: 4 passing tests, 0 failures, and the shell prompt returns automatically. If you see `Connected to MongoDB` during `npm test`, check that `tests/api.test.js` imports `../src/app.js`, not `../src/server.js`. The production Docker command remains `node src/server.js`.
