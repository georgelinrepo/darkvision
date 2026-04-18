"""
DarkVision — Move Normaliser Lambda Proxy

POST /normalise-move
Body: { "transcript": "knight echo five" }
Returns: { "san": "Ne5" } or { "san": null }

The Anthropic API key is fetched from SSM Parameter Store at cold start
(/darkvision/anthropic-key, SecureString). It is never stored in env vars
or CloudFormation and is not visible in the AWS console.
"""
import json
import os
import urllib.request
import urllib.error
import boto3

SSM_PARAM = os.environ.get("SSM_PARAM_NAME", "/darkvision/anthropic-key")

def _fetch_api_key() -> str:
    ssm = boto3.client("ssm")
    resp = ssm.get_parameter(Name=SSM_PARAM, WithDecryption=True)
    return resp["Parameter"]["Value"]

# Cached at module level — persists across warm invocations
ANTHROPIC_API_KEY = _fetch_api_key()
MODEL = "claude-haiku-4-5-20251001"
SYSTEM = (
    "You parse spoken chess moves into standard algebraic notation. "
    "Return the SAN string only (e.g. Nf3, Qxe5, e4, O-O, O-O-O, e8=Q). "
    "Return UNCLEAR if genuinely ambiguous. Nothing else. No explanation."
)


def _resp(status=200, body=None):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body or {}),
    }


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "POST").upper()

    if method == "OPTIONS":
        return _resp(200)

    try:
        body = json.loads(event.get("body") or "{}")
        transcript = body.get("transcript", "").strip()
    except (json.JSONDecodeError, TypeError):
        return _resp(400, {"error": "Invalid JSON"})

    if not transcript:
        return _resp(400, {"error": "transcript required"})

    if not ANTHROPIC_API_KEY:
        return _resp(503, {"error": "ANTHROPIC_API_KEY not configured"})

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": 16,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": transcript}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
        text = (data.get("content") or [{}])[0].get("text", "").strip()
        san = None if text == "UNCLEAR" or not text else text
        return _resp(200, {"san": san})
    except urllib.error.HTTPError as e:
        return _resp(502, {"error": f"Anthropic {e.code}"})
    except Exception as e:
        return _resp(502, {"error": str(e)})
