# Functions

## Purpose

Server-side request handlers used by the deployed portfolio platform.

## Contents

Cloudflare Pages Functions, currently including the GitHub OAuth endpoint used by Content Studio.

## Responsibilities

Keep secrets and provider credentials in deployment configuration; handlers should expose only the required API behavior.

## Important Notes

The functions are deployed separately from the static assets and must preserve their route paths.
