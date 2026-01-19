# Wix UCP TPA Documentation

## 📚 Documentation Index

Welcome to the Wix UCP TPA documentation. This project implements the [Universal Commerce Protocol (UCP)](https://ucp.dev/playground/) on top of Wix eCommerce.

---

## 🎯 Quick Links

| Document | Description |
|----------|-------------|
| [Main README](../README.md) | Project overview |
| [Quick Start](../QUICKSTART.md) | Get up and running |

---

## 📊 Presentation Decks

Ready-to-present slide decks explaining different aspects of the implementation.

| Deck | Slides | Description |
|------|--------|-------------|
| [UCP Implementation](decks/DECK_UCP_IMPLEMENTATION.md) | 16 | **Main deck** - Complete implementation overview |
| [Architecture](decks/DECK_ARCHITECTURE.md) | 12 | System architecture and layers |
| [Server Checkout](decks/DECK_SERVER_CHECKOUT.md) | 14 | Server-side checkout deep dive |
| [A2A Protocol](decks/DECK_A2A.md) | 16 | Agent-to-Agent implementation |
| [Technical](decks/DECK_TECHNICAL.md) | 15 | Technical deep dive |
| [Business](decks/DECK_BUSINESS.md) | 8 | Business value proposition |

---

## 📖 Guides

Step-by-step guides for setup, configuration, and testing.

| Guide | Description |
|-------|-------------|
| [Configuration Guide](guides/CONFIGURATION_GUIDE.md) | Environment setup and configuration |
| [Deployment Guide](guides/DEPLOYMENT_GUIDE.md) | Deploy to Render |
| [Manual Testing Guide](guides/MANUAL_TESTING_GUIDE.md) | Test all endpoints |
| [LLM Agent Testing](guides/LLM_AGENT_TEST.md) | Test AI chat interface |
| [Redis Setup](guides/REDIS_SETUP.md) | Configure Redis for production |

---

## 📋 Reference

Technical reference documentation.

| Document | Description |
|----------|-------------|
| [UCP Implementation Summary](reference/UCP_IMPLEMENTATION_SUMMARY.md) | Complete technical reference (600+ lines) |
| [Google Merchant Setup](reference/GOOGLE_MERCHANT_SETUP.md) | Google Pay integration (optional) |

---

## 🗄️ Archive

Historical documentation from development phases. Kept for reference.

| Document | Phase | Description |
|----------|-------|-------------|
| [Phase 1.1 Summary](archive/PHASE_1.1_SUMMARY.md) | 1 | Project setup |
| [Phase 1.3 Summary](archive/PHASE_1.3_SUMMARY.md) | 1 | Webhooks & dashboard |
| [Phase 2.1 Summary](archive/PHASE_2.1_SUMMARY.md) | 2 | Products integration |
| [Phase 2 Complete](archive/PHASE_2_COMPLETE.md) | 2 | Phase 2 completion |
| [Phase 3 Summary](archive/PHASE_3_SUMMARY.md) | 3 | Cart & checkout |
| [Phase 3 Testing](archive/PHASE_3_TESTING.md) | 3 | Testing report |
| [Testing Report](archive/TESTING_REPORT.md) | - | Full test report |
| [Status](archive/STATUS.md) | - | Project status |
| [Next Steps](archive/NEXT_STEPS.md) | - | Future roadmap |
| [Bootstrap Summary](archive/BOOTSTRAP_SUMMARY.md) | 1 | Initial bootstrap |
| [Deployment Success](archive/DEPLOYMENT_SUCCESS.md) | - | First deployment |
| [OAuth Fix](archive/OAUTH_FINAL_FIX.md) | - | OAuth troubleshooting |
| [Instance Auth Fix](archive/INSTANCE_AUTH_FIX.md) | - | Auth troubleshooting |
| [Dashboard Testing](archive/DASHBOARD_TESTING_GUIDE.md) | - | Dashboard tests |

---

## 🔧 Development Rules

The `.cursor/rules/` folder contains development guidelines and phase-by-phase implementation rules.

```
.cursor/rules/
├── 00-master-index.md      ← Start here
├── phase-1/                ← OAuth, webhooks
├── phase-2/                ← Products, orders
├── phase-3/                ← Cart, checkout
├── phase-4-6/              ← UCP basics
├── phase-7-14/             ← UCP advanced
└── practices/              ← TDD, security
```

---

## 📁 Directory Structure

```
docs/
├── README.md               ← You are here
├── decks/                  ← 6 presentation decks
├── guides/                 ← 5 setup/testing guides
├── reference/              ← 2 technical references
└── archive/                ← 14 historical docs
```

---

*Last Updated: January 19, 2026*
