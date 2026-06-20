#!/usr/bin/env bash
# Send monitoring / deploy alerts via webhook or email API (curl only).
#
# Environment:
#   ALERT_WEBHOOK_URL   — Slack-compatible incoming webhook (preferred)
#   MAILGUN_API_KEY + MAILGUN_DOMAIN + ALERT_EMAIL_TO — optional email
#   SENDGRID_API_KEY + ALERT_EMAIL_TO + ALERT_EMAIL_FROM — optional email

set -euo pipefail

send_alert() {
  local subject="$1"
  local body="$2"
  local sent=0

  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
    if curl -sf -X POST "$ALERT_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      --data-binary @- <<EOF
{"text":"*${subject}*\n${body}"}
EOF
    then
      sent=1
      echo "Alert sent via webhook"
    fi
  fi

  if [ -n "${MAILGUN_API_KEY:-}" ] && [ -n "${MAILGUN_DOMAIN:-}" ] && [ -n "${ALERT_EMAIL_TO:-}" ]; then
    if curl -sf -X POST "https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages" \
      -u "api:${MAILGUN_API_KEY}" \
      --form-string "from=${ALERT_EMAIL_FROM:-Capture GPS <alerts@${MAILGUN_DOMAIN}>}" \
      --form-string "to=${ALERT_EMAIL_TO}" \
      --form-string "subject=${subject}" \
      --form-string "text=${body}" >/dev/null; then
      sent=1
      echo "Alert sent via Mailgun"
    fi
  fi

  if [ -n "${SENDGRID_API_KEY:-}" ] && [ -n "${ALERT_EMAIL_TO:-}" ]; then
    local from="${ALERT_EMAIL_FROM:-alerts@gps-tracker-pro.ma}"
    if curl -sf -X POST 'https://api.sendgrid.com/v3/mail/send' \
      -H "Authorization: Bearer ${SENDGRID_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d "{\"personalizations\":[{\"to\":[{\"email\":\"${ALERT_EMAIL_TO}\"}]}],\"from\":{\"email\":\"${from}\"},\"subject\":\"${subject}\",\"content\":[{\"type\":\"text/plain\",\"value\":\"${body}\"}]}" >/dev/null; then
      sent=1
      echo "Alert sent via SendGrid"
    fi
  fi

  if [ "$sent" -eq 0 ]; then
    echo "WARN: No alert channel configured (set ALERT_WEBHOOK_URL or email API vars)" >&2
    return 1
  fi
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  send_alert "${1:-Capture GPS alert}" "${2:-No details}"
fi
