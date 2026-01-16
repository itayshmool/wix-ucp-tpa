# Phase 1: Wix TPA Foundation

Build the foundational infrastructure for your Wix Third-Party Application.

## Goals
- Set up Node.js/TypeScript project structure
- Implement Wix OAuth 2.0 authentication flow
- Handle webhooks from Wix platform
- Create merchant dashboard interface

## Guides in This Phase

### 1.1 Project Setup & Configuration
- Initialize Node.js project with TypeScript
- Configure environment variables
- Set up directory structure
- Create logger and config utilities

### 1.2 OAuth Authentication
- Implement OAuth 2.0 flow for Wix
- Token management (access/refresh)
- Wix API client with automatic token refresh
- Instance store for merchant installations

### 1.3 Webhooks & Dashboard
- Webhook signature verification
- Handle app installed/removed events
- Create embedded dashboard for merchants
- Decode Wix instance context

## Prerequisites
- Node.js 20+
- Wix App created in Wix App Market
- ngrok or similar for local development

## Order of Implementation
1.1 → 1.2 → 1.3

## Key Deliverables
- ✅ Server starts and validates environment
- ✅ OAuth installation flow works
- ✅ Webhooks are received and verified
- ✅ Dashboard loads in Wix iframe
- ✅ Token refresh works automatically
