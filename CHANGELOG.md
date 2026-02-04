# CHANGELOG

All notable changes to the "CashTrace" project will be documented in this file.

## [2.0.0] - 2026-02-01 (Release "CashTrace PWA")

### Project Highlights
- **Product Version**: 2.0.0 (Unified Release)
- **Frontend Version**: 1.0.0
- **Backend Version**: 1.1.0

### Added
- **PWA Support**: App is now installable on Mobile and Desktop.
- **Manifest**: Added `manifest.json` with app identity and icons.
- **Mobile Network Config**: Added `allowedDevOrigins` to support local mobile testing.
- **Environment**: Updated `.env.local` to support LAN IP connections.

### Fixed
- **Login Bug**: Added `suppressHydrationWarning` to login forms to prevent Mobile Browser hydration errors.
- **API Import**: Fixed incorrect import paths pointing to deleted `api.js`.

---

## [1.1.0] - 2026-02-01 (Backend)
### Changed
- **Network Binding**: Server now listens on `0.0.0.0` (All Interfaces) instead of just localhost.
- **CORS Config**: Updated `app.js` to allow connections from LAN IPs and designated Frontends.

### Security
- **Firewall**: Documented port 5000/3000 requirements for local access.
