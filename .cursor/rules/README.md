# Cursor Rules Structure

Complete development guide for building a Wix TPA with UCP integration.

## 📁 Directory Structure

```
.cursor/rules/
├── 00-master-index.md              # 📚 Project Overview & Quick Reference
│
├── practices/                      # 🎯 Professional Development Standards
│   ├── tdd.mdc                    #    • Test-Driven Development rules
│   ├── security.mdc               #    • Security best practices
│   └── testing.mdc                #    • Testing strategy & standards
│
├── phase-1/                        # Phase 1: Wix TPA Foundation
│   ├── README.md                  #    • Phase overview
│   ├── phase-1.1-project-setup.md #    • Project setup & configuration
│   ├── phase-1.2-oauth.md         #    • OAuth authentication
│   └── phase-1.3-webhooks-dashboard.md  # • Webhooks & dashboard
│
├── phase-2/                        # Phase 2: Wix Store Integration
│   ├── README.md                  #    • Phase overview
│   ├── phase-2.1-products.md      #    • Products & catalog service
│   ├── phase-2.2-orders.md        #    • Orders service
│   └── phase-2.3-inventory.md     #    • Inventory service
│
├── phase-3/                        # Phase 3: External Checkout
│   ├── README.md                  #    • Phase overview
│   ├── phase-3.1-cart.md          #    • Cart management
│   ├── phase-3.2-checkout.md      #    • Hosted checkout & redirect
│   └── phase-3.3-order-completion.md  # • Order completion & webhooks
│
└── phase-4-6/                      # Phases 4-6: UCP Integration
    ├── README.md                   #    • Phase overview
    ├── phase-4.1-ucp-profile.md    #    • UCP business profile & discovery
    ├── phase-4.2-ucp-checkout.md   #    • UCP checkout capability
    ├── phase-5-ucp-capabilities.md #    • UCP skills (products, orders)
    └── phase-6-production.md       #    • Production readiness
```

## 🎯 How to Use This Guide

### Starting Development
1. **Read**: `00-master-index.md` for complete project overview
2. **Follow**: Phases sequentially (1.1 → 1.2 → 1.3 → 2.1 → ... → 6)
3. **Apply**: Professional practices from `practices/` folder at every step

### During Development
- **Before writing code**: Review `practices/tdd.mdc`
- **Adding authentication**: Check `practices/security.mdc`
- **Writing tests**: Follow `practices/testing.mdc`
- **Need context**: Read phase `README.md` files

### Quick Reference
- **All endpoints**: See `00-master-index.md`
- **Environment vars**: See `00-master-index.md`
- **Wix permissions**: See `00-master-index.md`
- **UCP capabilities**: See `00-master-index.md`

## 📋 Development Phases

| Phase | Focus | Files | Duration |
|-------|-------|-------|----------|
| **1** | Wix TPA Foundation | 3 guides | 2-3 days |
| **2** | Wix Store Integration | 3 guides | 3-4 days |
| **3** | External Checkout | 3 guides | 2-3 days |
| **4-6** | UCP Integration | 4 guides | 5-7 days |

**Total**: ~14-17 days for full implementation

## 🎯 Professional Standards

All code must follow these practices:

### Test-Driven Development (`practices/tdd.mdc`)
- ✅ Tests written BEFORE implementation
- ✅ Red-Green-Refactor cycle
- ✅ 70% minimum coverage (90%+ for critical code)
- ❌ No code without tests

### Security (`practices/security.mdc`)
- ✅ Input validation with Zod
- ✅ Authentication with JWT + HTTP-only cookies
- ✅ Rate limiting on all endpoints
- ✅ Webhook signature verification
- ❌ No secrets in logs or version control

### Testing Strategy (`practices/testing.mdc`)
- ✅ 70% unit tests, 25% integration, 5% E2E
- ✅ Vitest for all testing
- ✅ Mocking for external APIs
- ✅ CI/CD with coverage enforcement

## 🚀 Quick Start

```bash
# 1. Review project overview
cat .cursor/rules/00-master-index.md

# 2. Start with Phase 1
cd .cursor/rules/phase-1
cat README.md

# 3. Follow Phase 1.1
cat phase-1.1-project-setup.md

# 4. Apply TDD practices
cat ../practices/tdd.mdc
```

## 📚 Content Summary

- **1** Master index
- **4** Phase folders
- **4** Phase README files
- **14** Phase implementation guides
- **3** Professional practice standards

**Total**: 22 comprehensive files covering the complete development lifecycle

## 🔗 External Resources

- **UCP Specification**: https://ucp.dev/specification/overview
- **UCP GitHub**: https://github.com/Universal-Commerce-Protocol/ucp
- **Wix API Docs**: https://dev.wix.com/docs/rest/getting-started
- **Wix Payments**: https://dev.wix.com/docs/api-reference/payments
- **Wix eCommerce**: https://dev.wix.com/docs/api-reference/e-commerce

## 💡 Tips

1. **Don't skip practices** - They're mandatory, not optional
2. **Read phase READMEs first** - Get context before diving in
3. **Follow sequential order** - Each phase builds on previous ones
4. **Refer to master index** - Your quick reference for everything
5. **Test everything** - No exceptions to TDD rules

---

**Built with ❤️ for creating AI-powered commerce experiences**
