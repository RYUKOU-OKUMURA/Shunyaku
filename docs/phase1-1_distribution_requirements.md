# Phase1-1 Distribution Requirements (Apple Developer ID / Codesigning)

## Goal
Document the concrete steps, assets, and risks required to ship a signed and notarized macOS build of the Shunyaku Tauri app under Phase1-1.

## Apple Developer Program Enrollment
- **Account type**: Apple Developer Program (annual membership) is required to obtain Developer ID certificates for distribution outside the Mac App Store.
- **Cost**: USD 99 / JPY ~13,800 per year (tax may apply). Auto-renews unless cancelled.
- **Personal vs organization**: Individual devs can enroll with a personal Apple ID. Company enrollment requires a legal entity name and D-U-N-S number that matches Apple’s records.
- **Prerequisites**:
  - Apple ID with two-factor authentication enabled.
  - Legal name, address, and phone number for verification.
  - D-U-N-S number (company only). Apple provides a lookup form; creation can take 1–5 business days.
  - Authority to sign legal agreements on behalf of the company (organization accounts).
- **Enrollment steps**:
  1. Sign in at <https://developer.apple.com/programs/> and click “Enroll”.
  2. Choose Individual or Organization, confirm contact details, and accept the license agreement.
  3. Provide payment details to complete purchase. Apple issues a confirmation email within minutes.
  4. For organizations, Apple may call to validate authority (usually within 24–48 hours). Enrollment completes once the email “Welcome to the Apple Developer Program” arrives.
- **Lead time**: Individuals can finish same day. Organizations should reserve 3–7 business days to cover D-U-N-S verification and Apple’s manual review.
- **Post-enrollment checks**:
  - Verify you can sign in to <https://developer.apple.com/account/resources/certificates/list>.
  - Install Xcode or the Command Line Tools so `xcode-select --install` succeeds (required for codesign tooling).
  - Ensure the Team ID and legal name are documented for later use in Tauri configs and notarization.

## Developer ID Certificates
- Apple issues two certificate types relevant to non-App-Store distribution:
  1. `Developer ID Application` — used to sign `.app` bundles.
  2. `Developer ID Installer` — used to sign `.pkg` installers (optional if distributing `.dmg`).
- **Create a CSR (Certificate Signing Request)**:
  - Open Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority.
  - Enter the Apple ID email, set “Saved to disk”, and check “Let me specify key pair information” (RSA 2048-bit is sufficient).
  - Keychain Access stores the private key under “login”. Keep it secure; do not share the CSR/private key.
- **Generate and install certificates**:
  1. In the developer portal, navigate to Certificates → `+` → Platform `macOS` → `Developer ID Application`.
  2. Upload the CSR, download the resulting `.cer`, and double-click to import it into the login keychain.
  3. Repeat for `Developer ID Installer` if you plan to distribute signed `.pkg` installers.
  4. Confirm Keychain Access shows “Developer ID Application: Your Name (TeamID)” with a matching private key icon.
- **Keychain hygiene**:
  - Set the private key access to “Allow all applications to access this item” *only* after carefully reviewing security needs. For CI, create a dedicated keychain and restrict access to the Tauri build tooling.
  - Export the certificate and key (as `.p12`) for backup. Protect with a strong passphrase and store in a secure secrets vault.

## macOS Codesign & Notarization Workflow (Tauri)
1. **Prepare environment**:
   - Install Xcode Command Line Tools (`xcode-select --install`).
   - Install the latest Tauri CLI and ensure the project has a unique `bundle.identifier` in `src-tauri/tauri.conf.json` (reverse-DNS, e.g., `com.shunyaku.app`).
   - Add the Developer ID Application certificate’s Common Name to secure storage (for reference). It usually appears as `Developer ID Application: <Team Name> (<TeamID>)`.
2. **Configuring Tauri**:
   - In `src-tauri/tauri.conf.json`, set:
     ```json
     {
       "bundle": {
         "identifier": "com.shunyaku.app",
         "macOS": {
           "entitlements": "./entitlements.plist",
           "exceptionDomain": "",
           "frameworks": [],
           "signingIdentity": "Developer ID Application: Team Name (TEAMID)"
         }
       }
     }
     ```
   - Ensure an entitlements file exists (Tauri defaults usually suffice). For distribution builds, disable debugger allowance by omitting `com.apple.security.get-task-allow` or setting it to `false`.
3. **Build and sign**:
   - Run `pnpm tauri build --target universal-apple-darwin` (or the project’s package manager equivalent). Tauri uses `codesign` automatically if `signingIdentity` is configured and the certificate is in the keychain.
   - Alternatively, manually sign the `.app` bundle with:
     ```bash
     codesign --force --options runtime --timestamp \
       --entitlements entitlements.plist \
       --sign "Developer ID Application: Team Name (TEAMID)" path/to/Shunyaku.app
     ```
   - Verify signature:
     ```bash
     codesign --verify --deep --strict --verbose=2 path/to/Shunyaku.app
     ```
4. **Notarization** (required for macOS 10.15+ Gatekeeper):
   - Create App Store Connect API key credentials or use an Apple ID with an app-specific password. Preferred approach is `notarytool` with an API key:
     ```bash
     xcrun notarytool store-credentials ShunyakuNotary \
       --apple-id YOUR_APPLE_ID \
       --team-id TEAMID \
       --password APP_SPECIFIC_PASSWORD
     ```
   - Submit the `.app` (or zipped `.app`) for notarization:
     ```bash
     ditto -c -k --keepParent path/to/Shunyaku.app Shunyaku.zip
     xcrun notarytool submit Shunyaku.zip --keychain-profile ShunyakuNotary --wait
     ```
   - After approval, staple the ticket to every distributable artifact:
     ```bash
     xcrun stapler staple path/to/Shunyaku.app
     xcrun stapler staple path/to/Shunyaku.dmg   # if distributing a DMG
     ```
   - Gatekeeper check:
     ```bash
     spctl --assess --type execute --verbose path/to/Shunyaku.app
     ```
5. **CI/CD considerations**:
   - Use a dedicated macOS runner (Apple Silicon preferred) with the certificate imported into a custom keychain.
   - Unlock the keychain in CI using `security unlock-keychain -p "$KEYCHAIN_PWD"` before invoking Tauri builds.
   - Store sensitive values (`APPLE_ID`, `TEAM_ID`, `NOTARY_KEY_ID`, `NOTARY_KEY`, `KEYCHAIN_PWD`) in a secrets manager; never commit them.

## Distribution Artifacts
- `.app` bundle signed and stapled.
- Optional `.dmg` created via Tauri bundler (`tauri.conf.json > bundle > macOS > dmg`).
- Release notes and checksum (e.g., `shasum -a 256 Shunyaku.dmg`).
- QA checklist confirming Gatekeeper launches without override.

## Risks & Mitigations
- **Enrollment delays**: Start Apple Developer Program enrollment immediately to absorb D-U-N-S validation delays. Track status and escalate via Apple Support if no response within 7 business days.
- **Certificate expiration**: Developer ID certificates expire in 5 years. Schedule calendar reminders and archive `.p12` backups securely.
- **Notarization outages**: Have a fallback plan (status page monitoring). Notarization is mandatory for macOS 10.15+, so plan release timelines with buffer time.
- **CI secrecy leaks**: Restrict certificate export, rotate app-specific passwords regularly, and audit runner logs to confirm secrets are masked.

## Next Steps (Phase1-1 scope)
1. Capture company-specific data: legal entity name, Team ID, billing owner, and contact emails.
2. Draft entitlements file and confirm the app uses only necessary capabilities.
3. Prepare automation scripts (e.g., npm `sign` and `notarize` scripts) once Tauri scaffolding is ready.
4. Coordinate with the teammate responsible for Tauri initialization to ensure `bundle.identifier` and signing config are set early to avoid rebuild churn.
