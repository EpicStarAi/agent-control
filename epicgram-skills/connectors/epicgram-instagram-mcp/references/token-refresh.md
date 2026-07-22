# Instagram Long-Lived Token Refresh

Long-lived Instagram tokens expire after **60 days**. Refresh them before expiry.

## Check token expiry
```bash
curl "https://graph.facebook.com/v21.0/me?access_token=YOUR_TOKEN&fields=id,name"
# Check the response for expiry info
curl "https://graph.facebook.com/v21.0/me?access_token=YOUR_TOKEN&fields=token_expiry_time"
```

## Refresh (within 60 days of issue)
```bash
curl "https://graph.instagram.com/refresh_access_token\
?grant_type=ig_refresh_token\
&access_token=YOUR_LONG_LIVED_TOKEN"
```
Returns a new token valid for another 60 days.

## Auto-refresh setup (cron)
Add to crontab on the VPS running ig-mcp:
```
0 9 * * 1 /usr/local/bin/refresh-ig-token.sh
```

`refresh-ig-token.sh`:
```bash
#!/bin/bash
NEW_TOKEN=$(curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$INSTAGRAM_ACCESS_TOKEN" | jq -r '.access_token')
export INSTAGRAM_ACCESS_TOKEN="$NEW_TOKEN"
# Update your env management (systemd EnvironmentFile, .env, secrets manager)
echo "INSTAGRAM_ACCESS_TOKEN=$NEW_TOKEN" > /etc/epicgram/instagram.env
systemctl restart instagram-mcp
```

## If token is expired (> 60 days)
Must re-authorize via Facebook Login. Generate a new short-lived token in Graph API Explorer, then exchange for long-lived:
```bash
curl "https://graph.facebook.com/v21.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=YOUR_APP_ID\
&client_secret=YOUR_APP_SECRET\
&fb_exchange_token=SHORT_LIVED_TOKEN"
```
