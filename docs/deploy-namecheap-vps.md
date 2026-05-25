# Deploying the MoEYS Thesis Portal to a Namecheap VPS

A complete, beginner-friendly walkthrough for migrating the portal from Vercel
to a self-managed Namecheap VPS running Ubuntu 24.04 LTS. Written for someone
who has never administered a Linux server before.

**Each step explains WHY, not just WHAT.** Follow top to bottom in order.

---

## Before you start

### What you need

- A Namecheap account with a **VPS purchase** (not shared hosting, not EasyWP).
  The cheapest **Pulsar** tier (~$7/month) is enough for a pilot — 2 GB RAM,
  120 GB disk, 2.93 TB bandwidth.
- A domain name (yours is `wesoben.com`, managed at a separate registrar).
- Your project's existing services configured: Neon (database), Cloudflare R2
  (file storage), Resend (email).
- A Mac with Terminal (built in) or VS Code installed.
- Roughly 2–3 hours of focused time, plus DNS propagation wait.

### What you'll have at the end

- A working production site at `https://thesis-archive.wesoben.com`.
- The app running as a managed background service (auto-restarts on crash,
  starts on server reboot).
- HTTPS with a free Let's Encrypt certificate that auto-renews.
- A daily cron job for the embargo-release task.
- A simple `git push` → `git pull on VPS` workflow for future deploys.

### Terminology — read once before you start

| Term | What it means |
|---|---|
| **VPS** | Virtual Private Server. A Linux machine you rent. |
| **SSH** | Secure Shell. How you remotely control the server from your Mac. |
| **root** | The all-powerful admin account on Linux. |
| **sudo** | "Substitute User Do" — runs one command as root. Asks for your password. |
| **systemd** | Linux's standard service manager. Keeps your app running. |
| **nginx** | A web server. We use it as a reverse proxy + HTTPS handler. |
| **Let's Encrypt / certbot** | Free SSL certificates. certbot is the tool. |
| **tmux** | A terminal session that survives if your SSH connection drops. |
| **A record** | DNS entry that maps a domain to an IP address. |

### Your specific setup (referenced throughout)

| | Value |
|---|---|
| VPS IP | `184.94.212.81` |
| Hostname | `server1.wesoben.com` |
| Production domain | `thesis-archive.wesoben.com` |
| Deploy user | `deploy` |
| GitHub repo | `https://github.com/ChhinhNyda/moeys-thesis-portal` |
| Project path on VPS | `/home/deploy/moeys-thesis-portal` |

If your IP differs, swap it everywhere. The rest stays the same.

### Critical password-management discipline

Linux passwords don't show characters as you type them. Combined with the
number of passwords here, it's easy to lose track. **Before you start, open
your Mac Notes (or password manager) and create one file:**

```
=== Wesoben VPS ===
VPS IP:           184.94.212.81
SSH command:      ssh deploy@184.94.212.81

ROOT pwd:         (filled in during Step 1.2)
DEPLOY pwd:       (filled in during Step 2.3)
CRON_SECRET:      (filled in during Step 5.2)
```

You will paste actual values into this file as you go. Treat it like the keys
to a safe — if you lose this file, you'll need to reset the VPS.

---

## Part 1 — Provision the server

### Step 1.1 — Confirm you bought a VPS, not shared hosting

In your Namecheap dashboard, click **Hosting List** in the left sidebar. The
product name must mention **VPS** (Pulsar / Quasar / Magnetar). If it says
Stellar, EasyWP, or just "Hosting" — that's shared hosting, **it cannot run
this app**. Refund and rebuy a VPS within the 30-day window.

### Step 1.2 — Install Ubuntu 24.04 on the VPS

The VPS ships without an OS. You install one through Namecheap's VPS Panel.

1. From the Namecheap dashboard, click **Manage** next to your VPS, then **Go
   to Panel**. You land on **vpspanel.web-hosting.com** with your server's
   control page open. It shows status (Online/Offline), IP, OS, disk, etc.
2. Find the action buttons row. Click **Reinstall** (the orange icon, usually
   the 4th button).
3. Pick **Ubuntu 24.04 blank (64-bit)** from the OS list.
   - Why "blank"? It means no extra software pre-installed. Other options
     (cPanel, Webuzo, LAMP) come with control panels we don't need.
   - Why 24.04? It's an LTS release ("Long Term Support") — security
     updates until 2029.
4. Set a strong **root password**. Style guide for VPS passwords:
   - 16+ characters
   - Letters and numbers only (no symbols, no spaces)
   - Example pattern: `WesobenServer2026XYZ`
5. **Write the root password down in your Notes file IMMEDIATELY** before
   clicking Confirm. There is no password recovery.
6. Confirm. Installation takes 5–10 minutes. The Status field will change
   `Online` → `Installing` → `Online`.

**Checkpoint:** The VPS panel now shows OS = `Ubuntu 24.04 blank` and Status
= `Online`. Note your IP address (probably `184.94.212.81`).

### Step 1.3 — First SSH login

You'll connect to the server from your Mac.

1. Open **Terminal** on your Mac (Cmd+Space, type "Terminal", Enter) — or
   open the integrated terminal in VS Code (Ctrl+`).
2. Run:
   ```bash
   ssh root@184.94.212.81
   ```
3. The first time, you'll see a warning about "host authenticity". This is
   normal — SSH is asking if you trust this server's identity. Type `yes`
   and press Enter.
4. At `root@184.94.212.81's password:` type the root password from your
   Notes file. **You will not see characters appear as you type — this is
   normal Unix behavior, not a broken terminal.** Press Enter.

**Checkpoint:** You see a welcome banner and a prompt that looks like:

```
root@server1:~#
```

The `#` (vs `$`) indicates you are root. You are now controlling the server.

**If the connection times out** or asks for the password again repeatedly: see
the [Troubleshooting](#troubleshooting) section.

---

## Part 2 — Harden the server

Before installing anything, we lock the server down. Fresh internet-exposed
servers get attacked within hours. These steps drop the attack surface to
nearly zero.

### Step 2.1 — Update Ubuntu and install firewall + fail2ban

Why first: any package install benefits from latest security patches.

In your **root SSH session**, paste this whole block:

```bash
apt update && apt upgrade -y
```

It will run for 2–5 minutes. **Important warning:** during the upgrade, the
SSH service may restart, which can drop your existing connection. If your
terminal looks frozen for several minutes — that's normal. If you see
"Operation timed out" or "Connection closed", just reconnect with the same
`ssh root@184.94.212.81` and continue.

If a colorful dialog appears (e.g. a purple "Daemons using outdated
libraries" screen, or a service-restart prompt), press **Tab** to highlight
`<Ok>` and press **Enter**. Accept defaults.

Once you're back at `root@server1:~#`, install the firewall and brute-force
blocker:

```bash
apt install -y ufw fail2ban curl git ca-certificates
```

Configure the firewall to only allow SSH (port 22), HTTP (80), and HTTPS
(443):

```bash
ufw allow OpenSSH && \
ufw allow 80/tcp && \
ufw allow 443/tcp && \
ufw --force enable && \
systemctl enable --now fail2ban
```

When prompted "Command may disrupt existing ssh connections" — that's a false
alarm because we added the OpenSSH rule first. Type `y` and Enter.

**Checkpoint** — verify both are running:

```bash
ufw status
systemctl is-active fail2ban
```

You should see `Status: active` and `active`.

### Step 2.2 — Install tmux (for unstable connections)

If your internet is intermittent (common in Cambodia and many places),
running long commands directly through SSH risks losing work when the
connection drops. **tmux** creates a persistent session on the server —
commands keep running even if your SSH dies. You reconnect and "attach" to
the same session.

```bash
apt install -y tmux
tmux new -s setup
```

You'll notice a green status bar appears at the bottom of your terminal. That
means you're inside a tmux session named `setup`. Everything you run from
here on (in this part) runs inside tmux.

**If your connection ever drops:**
1. Reconnect: `ssh deploy@184.94.212.81` (or `root@...` while still in Part 2)
2. Reattach: `tmux attach -t setup`
3. You'll see exactly where you left off — possibly with a command still
   running.

### Step 2.3 — Create a non-root deploy user

Running everything as root is risky. We create a regular user named `deploy`
who can become root via `sudo` when needed.

In your tmux session (still as root):

```bash
adduser deploy
```

It asks:
- **New password:** type a strong password (no echo — normal). Style guide
  same as the root password.
- **Retype new password:** type it again.
- **Full Name, Room Number, Work Phone, etc.:** press Enter to skip each.
- **Is the information correct? [Y/n]:** press `Y` and Enter.

Give the deploy user the ability to use `sudo`:

```bash
usermod -aG sudo deploy
```

**Save the deploy password in your Notes file** right now:

```
DEPLOY pwd:  WesobenAdmin2026XYZ   (or whatever you set)
```

**Checkpoint:**

```bash
id deploy
```

The output should include `27(sudo)` in the groups list. That confirms deploy
is in the sudo group.

### Step 2.4 — Set up SSH key authentication for deploy

Passwords are typed by you (and brute-forced by bots). SSH keys are a much
stronger, also-more-convenient login method: your Mac proves it has the
private key matching the public key stored on the server. No typing
passwords for SSH ever again.

**Substep A — on your Mac**: print your existing public key (or create one
if missing). Open a **second Mac terminal tab** (Cmd+T) and paste:

```bash
ls ~/.ssh/id_ed25519.pub 2>/dev/null || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

The last line prints your public key — one long line starting with
`ssh-ed25519 AAAA...`. **Copy that entire line.** That's safe to share —
it's the public half of an asymmetric key pair.

**Substep B — back in your root SSH session** (the tmux one), install the
public key for the deploy user. Replace `PASTE_KEY_HERE` with the line you
just copied:

```bash
mkdir -p /home/deploy/.ssh && \
echo "PASTE_KEY_HERE" >> /home/deploy/.ssh/authorized_keys && \
chmod 700 /home/deploy/.ssh && \
chmod 600 /home/deploy/.ssh/authorized_keys && \
chown -R deploy:deploy /home/deploy/.ssh && \
ls -la /home/deploy/.ssh/
```

The `ls -la` output should show:
- `/home/deploy/.ssh/` owned by `deploy deploy`, permissions `drwx------`
- `/home/deploy/.ssh/authorized_keys` owned by `deploy deploy`, permissions
  `-rw-------`

**Substep C — test from your Mac**: in your **Mac terminal** (not the SSH
one), run:

```bash
ssh deploy@184.94.212.81
```

This should log you in **without asking for a password**. You'll see
`deploy@server1:~$`. The `$` (vs `#`) means you're a normal user, not root.

Confirm sudo works:

```bash
sudo whoami
```

It asks for the deploy password (only the first sudo call per session). Type
it. Should print `root`. That means deploy can elevate to root when needed.

Type `exit` to leave this test session.

### Step 2.5 — Lock down SSH

Now that deploy can SSH in via key, disable root SSH and password
authentication entirely. After this, only `deploy` (with their SSH key) can
log in via SSH.

**Important context** — Ubuntu reads SSH config files in alphabetical order
from `/etc/ssh/sshd_config.d/`. There's already a `50-cloud-init.conf` that
allows root login and password auth. We use the filename prefix `00-` so our
hardening file is read first (SSH uses "first match wins").

In your deploy session — open a Mac terminal and SSH as deploy (since root
SSH is what we're disabling, use deploy from here on):

```bash
ssh deploy@184.94.212.81
```

Then paste:

```bash
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
EOF
sudo sshd -t && echo "config OK" && sudo systemctl restart ssh && echo "SSH hardened"
```

It will ask for your deploy sudo password.

**Critical verification — in a separate Mac terminal tab:**

```bash
ssh root@184.94.212.81
```

Expected — **immediate failure with no password prompt:**

```
root@184.94.212.81: Permission denied (publickey).
```

That's the lockdown working.

**Emergency backup**: if SSH is ever truly broken, you can still log in via
the **VNC console** in the VPS panel (vpspanel.web-hosting.com → your server
→ VNC). That uses the username/password directly, bypassing SSH. Useful for
fixing things from inside the server when SSH is locked out.

---

## Part 3 — Install the application stack

Now you install everything the app needs.

In your deploy SSH session (`deploy@server1:~$`), start a fresh tmux session
as deploy:

```bash
tmux new -s install
```

Then paste the install block:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && \
sudo apt install -y nodejs postgresql postgresql-contrib nginx certbot python3-certbot-nginx && \
echo "" && \
echo "===== INSTALLED VERSIONS =====" && \
node --version && \
npm --version && \
psql --version && \
nginx -v && \
echo "===== STACK INSTALLED ====="
```

What this installs:
- **Node.js 22 LTS** (Next.js 16 requires Node 20+).
- **PostgreSQL 16** (just in case you want a local DB later; not required for
  this deploy since we keep using Neon).
- **nginx** (the web server / reverse proxy).
- **certbot** (Let's Encrypt SSL certificates).

Takes 3–7 minutes. **Inside tmux, it survives disconnects.**

**Checkpoint** — you should see:

```
===== INSTALLED VERSIONS =====
v22.x.x
10.x.x
psql (PostgreSQL) 16.x
nginx version: nginx/1.x.x
===== STACK INSTALLED =====
```

---

## Part 4 — Database strategy

Your current production database lives on **Neon** (Singapore region), a
managed Postgres service. Neon is separate from Vercel — your payment
problem with Vercel doesn't affect Neon.

**Recommendation: keep Neon.** Pros:
- Zero data migration work.
- Neon handles backups, scaling, and patches.
- Free tier covers small pilot databases.
- Loses one less self-managed dependency.

The VPS app simply connects to the same Neon URL the Vercel app used.

(If you ever want to migrate off Neon to local Postgres, the steps would be:
`pg_dump` from Neon, `psql` import to local Postgres, change `DATABASE_URL`
in `.env`. We won't do that here.)

---

## Part 5 — Deploy the application

### Step 5.1 — Clone the repo

In your deploy SSH session, in tmux:

```bash
cd ~
git clone https://github.com/ChhinhNyda/moeys-thesis-portal.git
cd moeys-thesis-portal
ls -la | head
```

Confirm the files are owned by `deploy deploy`.

### Step 5.2 — Create the `.env` file

This file tells the app where the database is, what API keys to use, etc. It
contains secrets — never commit it to git (your `.gitignore` already
excludes it).

You'll need values from two places:
- **Your local `.env`** on your Mac (`cat /Users/nydachhinh/moeys-thesis-portal/.env`)
- **Vercel's environment variables** (vercel.com → project → Settings → Environment Variables) for any variable that's only set in production

The `CRON_SECRET` is marked Sensitive on Vercel (you can't view it). That's
fine — we generate a new one for the VPS:

```bash
CRON_SECRET=$(openssl rand -hex 32)
cat > ~/moeys-thesis-portal/.env <<EOF
DATABASE_URL="<paste your Neon DATABASE_URL>"
R2_ACCESS_KEY_ID="<from your local .env>"
R2_SECRET_ACCESS_KEY="<from your local .env>"
R2_ENDPOINT="<from your local .env>"
R2_BUCKET_NAME="<from your local .env>"
RESEND_API_KEY="<from your local .env>"
RESEND_FROM_ADDRESS="noreply@thesis-archive.wesoben.com"
AUTH_SECRET="<from your local .env>"
AUTH_URL="https://thesis-archive.wesoben.com"
AUTH_TRUST_HOST="true"
CRON_SECRET="$CRON_SECRET"
NODE_ENV="production"
EOF
chmod 600 .env
echo "--- .env created. Save this CRON_SECRET to Notes: $CRON_SECRET ---"
```

**Key changes vs your local `.env`:**
- `AUTH_URL` changes from `http://localhost:3000` to
  `https://thesis-archive.wesoben.com` (the production URL).
- Add `NODE_ENV="production"`.
- Fix the typo: it's `RESEND_FROM_ADDRESS` (with two `E`s), not `RSEND_`.

Save the printed `CRON_SECRET` to your Notes file. You'll need it for the
cron job in Part 8.

### Step 5.3 — Install dependencies and build

```bash
npm ci && \
npx prisma generate && \
npm run build && \
echo "===== BUILD DONE ====="
```

Takes 2–5 minutes.

- `npm ci` installs the exact package versions from `package-lock.json`.
- `prisma generate` creates the TypeScript-typed database client.
- `npm run build` compiles Next.js for production (creates the `.next/`
  folder).

**Checkpoint:** the build outputs a route list and prints
`===== BUILD DONE =====`. If it fails, the error will mention the missing
variable, dependency, or syntax issue. Fix and rerun the same command.

---

## Part 6 — Run as a managed service (systemd)

Right now, the app is built but not running. If you ran `npm run start` it
would work — but quit when you closed your SSH session. We want it running
24/7, restarting on crash, and starting automatically when the server
reboots. That's what `systemd` is for.

### Step 6.1 — Create the systemd service file

In your deploy SSH session:

```bash
sudo tee /etc/systemd/system/thesis-portal.service > /dev/null <<'EOF'
[Unit]
Description=MoEYS Thesis Portal (Next.js)
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/moeys-thesis-portal
EnvironmentFile=/home/deploy/moeys-thesis-portal/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=thesis-portal

[Install]
WantedBy=multi-user.target
EOF
```

What this means:
- `User=deploy` — the app process runs as the unprivileged deploy user.
- `EnvironmentFile=...` — load all variables from `.env`.
- `ExecStart=npm run start` — same command you'd run manually.
- `Restart=always` — if the process crashes, restart it after 5 seconds.
- `WantedBy=multi-user.target` — start automatically on every server boot.

### Step 6.2 — Start the service

```bash
sudo systemctl daemon-reload && \
sudo systemctl enable --now thesis-portal && \
sleep 3 && \
sudo systemctl status thesis-portal --no-pager -l | head -20
```

`daemon-reload` makes systemd re-read service files. `enable --now`:
- `enable` = run on every boot
- `now` = also start it right now

**Checkpoint** — the status output should show:
- `Active: active (running)`
- An `npm run start` process in the CGroup
- A `next-server (v16.x.x)` child process

### Step 6.3 — Verify the app is responding

```bash
curl -sI http://localhost:3000 | head -5
```

Expected — a `200 OK` or `307/308` redirect header:

```
HTTP/1.1 200 OK
X-Powered-By: Next.js
...
```

**If it's not working**, check the logs:

```bash
sudo journalctl -u thesis-portal -n 50 --no-pager
```

The error message at the bottom tells you what's wrong. Common issues:
- Database connection error → check `DATABASE_URL` in `.env`
- Missing env var → check `.env` has all required keys
- Port 3000 in use → unlikely on a fresh server, but `sudo ss -tlnp | grep 3000` shows what's using it

---

## Part 7 — Public-facing web server (nginx + HTTPS)

Right now the app responds only on `localhost:3000` of the VPS. We need to
expose it on ports 80 and 443 with HTTPS so the public can reach it.
**nginx** sits in front as a reverse proxy.

### Step 7.1 — nginx reverse proxy config

```bash
sudo tee /etc/nginx/sites-available/thesis-portal > /dev/null <<'EOF'
server {
  listen 80;
  server_name thesis-archive.wesoben.com;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/thesis-portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

What this does:
- Defines an nginx "server" listening on port 80 for the domain
  `thesis-archive.wesoben.com`.
- `client_max_body_size 50M` — allows thesis PDF uploads up to 50 MB.
- The `proxy_pass` block forwards every request to your Next.js app at
  `127.0.0.1:3000` and copies relevant headers (so the app sees the real
  client IP, hostname, etc.).
- `nginx -t` validates the config before reloading — never skip this in
  production.

### Step 7.2 — Get a free Let's Encrypt SSL cert via certbot

**Before this step works**, the DNS A record for `thesis-archive.wesoben.com`
must already point to your VPS IP (`184.94.212.81`). certbot's "HTTP-01
challenge" requires Let's Encrypt to be able to reach `http://thesis-archive.wesoben.com/.well-known/...` and that only works if DNS resolves.

If DNS isn't pointing yet, **do Part 9 (DNS cutover) first**, then come back
to this step.

Once DNS is pointing at the VPS:

```bash
sudo certbot --nginx -d thesis-archive.wesoben.com
```

certbot interactively asks:
- **Email address** for renewal reminders → enter yours.
- **Terms of service** → press `Y` to agree.
- **Newsletter** → optional, `N` is fine.
- **Redirect HTTP to HTTPS?** → choose `2` (Redirect — recommended).

It will obtain the cert, update your nginx config to listen on 443 with SSL,
and add a redirect from HTTP→HTTPS. Auto-renewal is set up automatically
(it'll renew every 60 days).

**Verify auto-renewal works** (a dry-run):

```bash
sudo certbot renew --dry-run
```

Should print `Congratulations, all simulated renewals succeeded`.

**Verify HTTPS** in a browser: visit `https://thesis-archive.wesoben.com`. You
should see the portal with a green padlock.

---

## Part 8 — System cron for the daily embargo job

Your `vercel.json` defined a daily 02:00 UTC cron that calls
`/api/cron/release-embargoes`. On the VPS, we use Linux's built-in `cron`
instead.

```bash
crontab -e
```

If asked "Select an editor", choose **`1`** (nano — the easiest).

At the bottom of the file, add this single line (replace
`YOUR_CRON_SECRET_FROM_NOTES` with the value you saved in Step 5.2):

```
0 2 * * * curl -fsS -X GET https://thesis-archive.wesoben.com/api/cron/release-embargoes -H "Authorization: Bearer YOUR_CRON_SECRET_FROM_NOTES" >> /home/deploy/cron-embargoes.log 2>&1
```

Save and exit nano: **Ctrl+O, Enter, Ctrl+X**.

Verify it's installed:

```bash
crontab -l
```

It should print the line you just added.

The job runs at 02:00 UTC every day, calls the API with the bearer token,
and appends both stdout and stderr to `cron-embargoes.log`. Check the log
after the first run to confirm:

```bash
tail /home/deploy/cron-embargoes.log
```

---

## Part 9 — DNS cutover

Right now `thesis-archive.wesoben.com` (if it exists at all) points at Vercel.
We change the A record to point at the VPS IP.

### Step 9.1 — Lower the TTL first (recommended, do a day before)

Where to do this depends on where `wesoben.com`'s DNS is managed. Common
options:
- **Cloudflare** (if you set it up there)
- **Namecheap's BasicDNS** (if the domain is at Namecheap — your
  dashboard says "Domain is with another registrar", so probably not)
- **Other registrar** where you originally bought `wesoben.com`

In whatever DNS provider you use, find the **A record** for the subdomain
`thesis-archive` (or create one if it doesn't exist yet).

Before changing the IP, **lower the TTL to 300 seconds** (5 minutes). Why:
TTL is how long other DNS servers cache the record. If TTL is currently 1
hour, the cutover takes up to an hour to propagate. Lowering it to 5 min a
day in advance means the actual switch propagates in 5 min.

If you skip this step, the cutover still works — it just takes longer to
fully propagate.

### Step 9.2 — Update the A record

Set the record to:

| Field | Value |
|---|---|
| Type | `A` |
| Name / Host | `thesis-archive` |
| Value / IP | `184.94.212.81` |
| TTL | `300` (or whatever min your provider allows) |

Save.

### Step 9.3 — Verify DNS propagation

Wait 1–5 minutes (or up to an hour if TTL wasn't lowered), then check from
your Mac:

```bash
dig +short thesis-archive.wesoben.com
```

Should print `184.94.212.81`.

Or check globally at <https://www.whatsmydns.net/#A/thesis-archive.wesoben.com>.

Once DNS resolves, **return to Part 7.2** if you skipped it — get the
Let's Encrypt cert, then visit `https://thesis-archive.wesoben.com` to confirm
everything works.

---

## Part 10 — Tear down Vercel

Only after the VPS site is fully verified working — including the cron job,
SSL, and authentication — should you tear down Vercel.

1. Go to vercel.com → your project → **Settings** → scroll to the bottom →
   **Delete Project**.
2. Confirm.

This stops billing and removes the old deployment from the internet.

Note: Vercel and Neon are separate. Deleting the Vercel project does NOT
delete your Neon database. Neon keeps running and stays connected to your
VPS app.

---

## Part 11 — Your future deploy workflow

Now your normal day-to-day:

### Local (Mac)

```bash
# Make your changes in VS Code, then:
git add -A
git commit -m "describe what changed"
git push
```

### Deploy to VPS

In your VPS deploy session (or any Mac terminal):

```bash
ssh deploy@184.94.212.81 'cd ~/moeys-thesis-portal && git pull && npm ci && npm run build && sudo systemctl restart thesis-portal'
```

That single command pulls latest code, installs any new dependencies,
rebuilds, and restarts the service. Takes about 1–3 minutes.

If you want to roll back to a previous version:

```bash
ssh deploy@184.94.212.81
cd ~/moeys-thesis-portal
git log --oneline -10              # see recent commits
git checkout <commit-hash>         # roll back to a specific commit
npm ci && npm run build
sudo systemctl restart thesis-portal
```

To return to latest:

```bash
git checkout main
npm ci && npm run build
sudo systemctl restart thesis-portal
```

---

## Part 12 — Backups

Since the **database lives on Neon**, Neon handles automatic backups (up to
the limits of your plan). Verify by signing into Neon's dashboard and
finding the "Backups" or "Point-in-time recovery" section.

What's NOT backed up automatically and what you should think about:

| Asset | Where it lives | Backup strategy |
|---|---|---|
| Database (theses, users, HEIs) | Neon (Singapore) | Neon's automatic backups |
| Uploaded thesis PDFs | Cloudflare R2 | R2 has 11-nines durability; consider versioning |
| App code | GitHub + Mac + VPS | Git history is your backup |
| `.env` (secrets) | Only on VPS | **You should back this up manually** |
| nginx + systemd config | Only on VPS | Same |

For the VPS-only config (`/etc/nginx/sites-available/thesis-portal`,
`/etc/systemd/system/thesis-portal.service`, `~/moeys-thesis-portal/.env`),
copy them off the server periodically:

```bash
# From your Mac, on demand:
mkdir -p ~/backups/wesoben-vps/$(date +%Y-%m-%d)
cd ~/backups/wesoben-vps/$(date +%Y-%m-%d)
scp deploy@184.94.212.81:~/moeys-thesis-portal/.env env-backup.txt
ssh deploy@184.94.212.81 'sudo cat /etc/nginx/sites-available/thesis-portal' > nginx-config.txt
ssh deploy@184.94.212.81 'sudo cat /etc/systemd/system/thesis-portal.service' > systemd-unit.txt
echo "Backup snapshot saved to ~/backups/wesoben-vps/$(date +%Y-%m-%d)/"
```

Stash the backup folder somewhere not on the same Mac (iCloud / Google Drive
/ an external drive).

Also recommended: sign up for **UptimeRobot** (free) — it pings your site
every 5 minutes and emails you if it's down.

---

## Troubleshooting

### My SSH connection keeps dropping

Likely your home internet is unstable, not the VPS. Run long commands inside
`tmux` (Step 2.2). If a command was running when the connection dropped,
reconnect and run `tmux attach -t setup` (or whatever name) to rejoin — the
command is still running on the server.

### Password rejected ("Permission denied, please try again")

You're typing a different password than what's on the server. Options:

1. **Re-check your Notes file** — extra space at the start/end is the most
   common bug.
2. **Reset the password from the VPS panel VNC console**:
   - vpspanel.web-hosting.com → your server → **VNC** button
   - Log in as `root` in the browser console (uses the root password from
     your Notes)
   - Run `passwd deploy` to set a new deploy password
   - Update your Notes file immediately
3. **Don't have the root password either?** Use the VPS panel's
   **"Root/Admin Password"** tab to set a new root password without
   reinstalling. Then proceed as above.

### Host key changed warning (`REMOTE HOST IDENTIFICATION HAS CHANGED`)

This happens when the server's SSH host keys regenerate — usually after an
OS reinstall or an `openssh-server` upgrade. Fix:

```bash
ssh-keygen -R 184.94.212.81
ssh deploy@184.94.212.81
```

Type `yes` when asked to accept the new key.

### SSH lockdown didn't take effect

Common cause: a config file in `/etc/ssh/sshd_config.d/` with a lower
alphabetical prefix (e.g. `50-cloud-init.conf`) is overriding your
hardening file (e.g. `99-hardening.conf`). SSH uses "first match wins".

Fix: rename your hardening file to come first alphabetically:

```bash
sudo mv /etc/ssh/sshd_config.d/99-hardening.conf /etc/ssh/sshd_config.d/00-hardening.conf
sudo sshd -t && sudo systemctl restart ssh
```

### Build fails on the VPS

Common causes:
- `.env` missing or has typos → `cat ~/moeys-thesis-portal/.env`
- `node_modules` out of sync → `rm -rf node_modules && npm ci`
- Out of memory during build → upgrade VPS tier, or add swap:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

### App won't start (`systemctl status thesis-portal` shows failed)

```bash
sudo journalctl -u thesis-portal -n 100 --no-pager
```

Read the bottom of the log. Most common: a missing env var or a database
connection error. Fix the `.env` and:

```bash
sudo systemctl restart thesis-portal
```

### nginx returns "502 Bad Gateway"

The app crashed or isn't listening. Check:

```bash
sudo systemctl status thesis-portal
curl -sI http://localhost:3000
```

If the app isn't running, restart it:

```bash
sudo systemctl restart thesis-portal
```

### Let's Encrypt cert request fails

Almost always: DNS doesn't resolve yet. Wait, then retry:

```bash
dig +short thesis-archive.wesoben.com    # should print 184.94.212.81
sudo certbot --nginx -d thesis-archive.wesoben.com
```

### "Operation not supported" when running commands

You ran a VPS-only command on your Mac (or vice versa). Check your prompt
before pasting:

- **VPS:** `deploy@server1:~$` or `root@server1:~#`
- **Mac:** `nydachhinh@Nyda-Laptop` or similar

---

## Reference cheatsheet

### Files and paths

| Path | What it is |
|---|---|
| `/home/deploy/moeys-thesis-portal/` | Your app's home on the VPS |
| `/home/deploy/moeys-thesis-portal/.env` | Production secrets |
| `/etc/systemd/system/thesis-portal.service` | systemd unit file |
| `/etc/nginx/sites-available/thesis-portal` | nginx site config |
| `/etc/ssh/sshd_config.d/00-hardening.conf` | SSH lockdown rules |
| `/etc/letsencrypt/live/thesis-archive.wesoben.com/` | SSL cert |
| `/home/deploy/cron-embargoes.log` | Cron job output log |

### Useful commands

```bash
# App control
sudo systemctl restart thesis-portal     # restart the app
sudo systemctl status thesis-portal      # is it running?
sudo journalctl -u thesis-portal -f      # live tail logs
sudo journalctl -u thesis-portal -n 100  # last 100 log lines

# nginx control
sudo nginx -t                            # validate config
sudo systemctl reload nginx              # apply config changes
sudo journalctl -u nginx                 # nginx logs

# SSL cert
sudo certbot certificates                # what certs are installed?
sudo certbot renew --dry-run             # test auto-renewal

# Firewall
sudo ufw status numbered                 # list rules
sudo ufw allow <port>/tcp                # open a port
sudo ufw delete <number>                 # remove a rule

# fail2ban
sudo fail2ban-client status              # show jails
sudo fail2ban-client status sshd         # banned IPs on sshd
sudo fail2ban-client set sshd unbanip <ip>  # unban an IP

# OS updates (run monthly)
sudo apt update && sudo apt upgrade -y

# Disk space
df -h
du -sh ~/*

# What's listening on what port
sudo ss -tlnp
```

### Where to save in your password manager / notes

- VPS IP: `184.94.212.81`
- Root password (VPS panel + emergency VNC)
- Deploy password (every sudo command)
- CRON_SECRET (random hex, used in the cron line)
- DATABASE_URL (Neon connection string — already in your local `.env`)
- All R2 / Resend / Auth secrets (already in your local `.env`)
- VPS Panel login (vpspanel.web-hosting.com)
- Namecheap account login

---

## When you're done

Final post-cutover checklist:

- [ ] `https://thesis-archive.wesoben.com` loads with a green padlock
- [ ] You can sign in (magic link from Resend arrives)
- [ ] You can browse the public archive
- [ ] You can submit a test thesis (HEI Coordinator role)
- [ ] The cron job's log shows it ran at 02:00 UTC
- [ ] `sudo certbot renew --dry-run` passes
- [ ] UptimeRobot (or similar) is monitoring the site
- [ ] You have a backup of `.env`, `nginx config`, `systemd unit` off-server
- [ ] Vercel project deleted (or paused)
- [ ] Notes file in your password manager updated with the final secrets

Congratulations — you now run your own production server.
