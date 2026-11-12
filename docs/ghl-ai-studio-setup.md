# Publishing on a GoHighLevel AI Studio subdomain

AI Studio's Git Sync is two-way: commits pushed to the connected branch are pulled into AI Studio, and versions saved in AI Studio are pushed to GitHub. AI Studio **creates its own private repository** when you connect a project. It can't adopt an existing repo, so the showcase is loaded into the repo AI Studio creates.

Git Sync works with React (Vite) and TanStack Start projects. This repo keeps AI Studio's TanStack Start template. The showcase itself is static HTML in `public/showcase/`, and the home route redirects there.

## 1. Create the project and its repo (in HighLevel)

1. In the sub-account, open **AI Studio** and create a new project called **Earlibird Video Styles**. A one-line prompt such as "blank project" is fine; the content comes from the repo.
2. In the project, open **More → Git**, then choose **GitHub**.
3. Click **+ Add connection**, or **Connect** if your GitHub account is already listed.
4. Pick **Organization** (the Earlibird GitHub org) or **My GitHub account**. Set who can use it to **Only me**.
5. Click **Continue on GitHub**, then install and authorise the **Lead Connector** app. For an organisation, an org owner may need to approve it.
6. Back in AI Studio, wait for the connection to finish. AI Studio creates a **private** repository, pushes the first version and connects the `main` branch.
7. Leave **Automatic Push** and **Automatic Pull** on.

You need the "Manage Git & download code" permission (Settings → Team → Permissions → AI Studio). It's on by default.

## 2. Load the showcase into that repo

1. Clone the new repo, for example in GitHub Desktop: File → Clone repository.
2. From this folder, run the copy script against the clone:

```bash
bash scripts/apply-to-ai-studio-repo.sh "/path/to/the/cloned/repo"
```

3. Commit in the clone and push `main` (GitHub Desktop: **Push origin**).
4. AI Studio pulls the commit and builds a preview. Click **Refresh preview** (or **Update preview**). The home page should redirect to `/showcase/index.html`.

## 3. Publish to a subdomain

1. In AI Studio, click **Publish** (top right). You can rename the free `vibepreview.com` address with the pencil icon.
2. Click **Add custom domain** and enter the subdomain, for example `styles.earlibird.ai`.
3. Choose **Add automatically** if your DNS provider supports it. AI Studio will ask you to log in to the provider and approve the record.
   Otherwise, add the record manually wherever the domain's DNS is managed:

   | Type | Host / Name | Value / Target | TTL |
   |---|---|---|---|
   | CNAME | `styles` (the subdomain only) | **exactly the target AI Studio shows you** | Auto |

   Don't add the root domain. A subdomain keeps the main website untouched.
4. Wait for AI Studio to verify the domain (usually minutes, rarely up to 48 hours), then click **Publish** again.

After later changes are pulled in, publish again to update the live site.

## Rules for the connected repo

- Never force-push, rebase or amend commits that are already pushed. AI Studio would lose its history.
- Keep `main` working. Every commit becomes a new AI Studio version.
- Keep each media file under 25 MB (the hosting limit for a single static file). The current videos are 0.2 to 7 MB.
- Pushes are scanned for secrets. Never commit API keys.

## Repo visibility

The repo AI Studio creates is private. Attendees only need the subdomain link to browse. To let them clone the repo too, open it on GitHub and go to **Settings → General → Danger Zone → Change visibility → Public**. Do this only after a final check.
