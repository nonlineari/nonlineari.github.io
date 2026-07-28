# Portal addon (keep original iama.cc)

Main catalogue stays original. Only add links out to the local Plate OS.

| Path | Role |
|------|------|
| `/` | Original NLS RECORDS site |
| `/login/` | **Simple check-in** on this site (browser only) |
| `/portal/` | Addon page → button to ngrok/local Plate OS |
| `/portal-opensource/` | Optional CIM open hub |

## Pre-push login test

```bash
~/Videos/nls-plate-graal/scripts/attach-iama-portal.sh

# Plate accounts (full)
# open: http://127.0.0.1:8767/#accounts
# open: https://….ngrok-free.dev/#accounts

# Simple iama login page (local preview)
cd ~/nonlineari.github.io && python3 -m http.server 8877 --bind 127.0.0.1
# open: http://127.0.0.1:8877/login/
```

1. Check-in handle `prepush-test` → status shows token  
2. Check out → Guest  
3. Confirm Plate `#accounts` still works on ngrok  
4. Then push when ready  

Check-in uses the same SHA-256 formula as Plate OS (`handle:phrase:nls-plate-checkin`).
