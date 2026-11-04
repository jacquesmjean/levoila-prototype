# Branded sign-in emails

Supabase sends the sign-in link. Paste these into
**Authentication → Email Templates** in the Supabase dashboard for the tenant's
project, one template per tab. Replace the three placeholders (`{{ORG}}`,
`{{DOMAIN}}`, `{{EMBLEM}}`) with the tenant's values before pasting; the
`{{ .ConfirmationURL }}` and `{{ .SiteURL }}` tokens are Supabase's and stay.

For the message to come *from* the organisation's own address
(engage@ennoblerise.org) rather than Supabase's, set **Custom SMTP** under
Authentication → SMTP Settings with the organisation's mail provider.
That step needs credentials and is done by the account owner.

Subjects:
- Magic Link: `Your sign-in link — {{ORG}} Mission Control`
- Invite user: `You have been given access to {{ORG}} Mission Control`
- Reset password: `Reset your {{ORG}} Mission Control password`
