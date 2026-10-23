# Contact email options

The public site intentionally keeps `nandakumarmkdpm@gmail.com` unchanged. The current contact flow prepares a local `mailto:` message and does not send form data to a server.

If address harvesting becomes a concern, the owner can approve one of these follow-up options:

- A Cloudflare Worker endpoint that accepts a narrowly validated contact form, applies rate limiting and bot protection, and forwards messages without exposing the destination address in page HTML.
- A reputable form service configured with privacy, retention, spam-filtering, and data-processing terms acceptable to the owner.

Do not implement either option, change the address, or add a new backend without owner approval.
