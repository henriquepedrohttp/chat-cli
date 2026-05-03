# Chat CLI

Command-line chat client for talking to your partner.

## Commands

```bash
# Register
chat register -e email -p password -n nickname

# Login
chat login -e email -p password

# Send message
chat send "Hello!"

# List messages
chat list

# Sync new messages
chat sync

# Partner commands
chat partner connect -e partner@email.com
chat partner show

# Logout
chat logout
```

## Configuration

Credentials are stored in `~/.chat-cli/config.json`.