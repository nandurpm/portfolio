# Oauth

## Purpose

GitHub OAuth callback and token-exchange endpoint for Content Studio.

## Contents

The server-side handler that keeps the OAuth client secret out of the browser.

## Responsibilities

Only GitHub authentication exchange logic belongs here; editor state and publishing UI remain in `admin/`.

## Important Notes

Changes must preserve the callback route and deployment environment variable contract.
