# Facebook + Instagram Cross-Posting via Graph API

When Instagram and Facebook accounts are linked in Meta Business Suite, you can cross-post from Instagram Graph API to both platforms in one call — avoiding a separate Facebook connector for basic feed posts.

## Enable cross-posting (one-time setup)

1. Meta Business Suite → Settings → Accounts → Instagram Accounts
2. Link your Instagram account to the Facebook Page
3. Confirm: Settings → Instagram → Linked Facebook Page shows the page

## Cross-post API call

Add `facebook_places_name` and enable cross-posting in the container creation step:

```bash
# Create container with Facebook cross-post flag
POST https://graph.facebook.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media
Params:
  image_url: <CDN URL>
  caption: <caption>
  facebook_page_id: <linked page ID>  # enables cross-post
  access_token: {INSTAGRAM_ACCESS_TOKEN}
```

The published post appears on both Instagram and the linked Facebook Page simultaneously.

## Limitations
- Cross-posting is available for: image posts, Reels, carousels.
- Stories do NOT cross-post via this method.
- Facebook reach from cross-posting uses the Page's own organic reach, not Instagram's.
- Separate Page insights must be fetched from the Facebook Graph API endpoint, not Instagram's.

## When to use a dedicated Facebook connector instead
- Posting text-only updates (no media) — Instagram doesn't support text-only posts.
- Scheduling Facebook-only content.
- Running Facebook-specific features: check-ins, offers, events, polls.
- Managing Facebook Groups (requires separate Groups API).
