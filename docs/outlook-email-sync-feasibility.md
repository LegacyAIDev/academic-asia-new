# Outlook email sync: feasibility (Phase 1.5)

**Date:** 2026-10-30 · **Spec:** meeting note 3 (advanced), COM-04 to COM-06, INT-01 · **Status:** dropped on 2026-10-31 by decision; Outlook sync will not be built. Kept for reference only; the setup and decisions below are no longer needed.

The basic filing is built and browser tested (system-architecture 5.2d): staff save an email as `.eml`, `.msg` or PDF and upload it. This note covers the advanced step, connecting Outlook so staff do not have to save files first. The spec asks for the method to be confirmed before it is committed to the release (INT-01) and for the investigation to cover authentication, mailbox permissions, user isolation, storage, attachments, linking and retention (COM-04).

## Recommendation

Build **"File from Outlook"** inside the CRM: on a student, school or application page, staff open a picker that searches *their own* mailbox, tick the emails to file, and they go through the existing filing pipeline. Do not sync mailboxes automatically.

| Option | What staff do | Effort | Risk |
|---|---|---|---|
| A. File from Outlook (recommended) | In the CRM, search own mailbox, pick emails, file | About 4-6 days | Low: reuses the whole filing pipeline |
| B. Outlook add-in button | In Outlook, click "File to Academic Asia", pick the student | About 8-12 days, plus central add-in deployment by IT | Medium: second app to deploy and support |
| C. Automatic sync | Nothing; emails matched to students by address | Weeks | High: files private or unrelated mail, matching errors, privacy |

Option C is also excluded by spec section 1.4 ("automatic email scanners"). B can follow A later; both use the same server side.

## How A works

- **Reading a message.** Microsoft Graph returns any message as standard MIME with `GET /me/messages/{id}/$value` ([Microsoft Graph: Get message](https://learn.microsoft.com/en-us/graph/api/message-get)). That is the same format as an `.eml` file, so the server stores and parses it exactly as an uploaded `.eml` today (`storeStagedEmail`, `parse-email.ts`): same sanitising, attachments, duplicate check by Message-ID, permissions and activity history.
- **Authentication (COM-04).** Each staff member connects their own Microsoft 365 account once (OAuth authorization code flow with PKCE). Delegated permission **Mail.Read** only, plus `offline_access` for a refresh token. Delegated means the app can only ever do what the signed-in person can do in their own mailbox.
- **User isolation (COM-05).** Tokens are stored per CRM user, encrypted at rest (Supabase Vault), read only by server code, never sent to the browser. No shared or other users' mailboxes; no application-level ("all mailboxes") permission. A user's search and import use only their own token.
- **Storage and attachments.** Only the emails a person chooses are copied, into the private `filed-emails` bucket, with their attachments, as today. Nothing else from the mailbox is stored.
- **Linking (COM-06).** The picker opens from the record, so links default as they do now (student, school, application, D4) and can be changed in the same form.
- **Retention.** A filed email is a CRM record from then on: archive or Manager-only delete, as today. Disconnecting Outlook, or a staff member leaving, deletes their token; emails already filed stay.

## Work for A

1. Table `outlook_connections` (user, encrypted refresh token, Microsoft account, connected at); owner-only RLS.
2. Connect and disconnect routes (`/api/outlook/connect`, callback, disconnect) with state and PKCE.
3. Server actions: search own mailbox (`GET /me/messages?$search=…&$top=25`, subject, sender, date, has attachments), import selected (fetch `$value` per message, then the existing filing path).
4. Picker dialog on the Communications panel: "File from Outlook" next to "File email".
5. Unit tests with a stubbed Graph client; browser test against a test mailbox.

## Needed from Academic Asia before building

- **Microsoft 365 app registration** in Academic Asia's Entra ID tenant: client ID, client secret, tenant ID, redirect URL `https://<crm-domain>/api/outlook/callback`, delegated permissions `Mail.Read` and `offline_access`, and admin consent.
- **A test mailbox** with a few sample emails, for the browser test.
- **Decisions:**
  1. Option A only, or A then B?
  2. May every staff member connect, or only roles that file emails (consultants, CS, managers)?
  3. Keep the 25 MB per email limit for Outlook imports too?

## Unresolved questions

- Does Academic Asia allow third-party apps to read staff mailboxes with delegated consent, or must IT approve each app (admin consent workflow)?
- Are any staff on shared mailboxes they would want to file from? That needs `Mail.Read.Shared` and a separate decision.
