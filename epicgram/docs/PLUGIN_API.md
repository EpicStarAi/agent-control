# Plugin API (design — P19)

Modules (VPN, Publisher, AI Operator, DeepInside, Novikova, Eva, Analytics) attach to the platform **without changing the core**. The core exposes stable extension points; plugins register against them.

## Layout
```
plugins/
  vpn/            plugin.json + backend/ + ui/
  publisher/
  operator/
  deepinside/
  novikova/
  eva/
  analytics/
```

## plugin.json (manifest)
```json
{
  "id": "publisher",
  "name": "EPIC Publisher",
  "version": "0.1.0",
  "runtimes": ["telegram"],
  "provides": {
    "routes": ["/v1/plugins/publisher/*"],
    "capabilities": ["publisher"],
    "events": ["workflow.finished"],
    "ui": { "sidebar": true, "settingsSection": "EPIC AI" }
  },
  "permissions": ["telegram.send", "operator.approval"],
  "safety": { "requiresApproval": true, "killSwitchAware": true }
}
```

## Contract
- **Backend**: a plugin registers routes under `/v1/plugins/<id>/*` and may subscribe/publish on the Event Bus. It calls runtimes only through the Platform API + permission grants — never TDLib directly.
- **UI**: a plugin declares surfaces (sidebar entry, settings section, panels). The shell renders them only if `capabilities.plugins` and the plugin's own capability are `true`.
- **Safety**: side-effectful plugin actions go through the operator Approval Gate and respect the Kill Switch. A plugin can never bypass send/publish/finance gating.

## Loading
Core scans `plugins/*/plugin.json` at boot, validates manifest + permissions, and mounts routes/UI. Disabling a plugin = drop the folder or flag it off; core is untouched.

Status: **design only.** Runtime loader is a future P19 increment.
