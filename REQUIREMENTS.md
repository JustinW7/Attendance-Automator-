# Attendance Automation Requirements

## 1. Automatic Attendance Scheduling

- The application must automatically run at 8:30 AM IST on working days.
- The automation must be triggered using a systemd user timer.
- The application must use the local system time / Asia-Kolkata timezone.
- The application must not attempt attendance outside the configured attendance window.
- The default attendance window is 08:30 AM to 09:30 AM.

## 2. NexPeople / HRMS Integration

- The application must open the configured NexPeople HRMS URL.
- The HRMS URL must be configurable through `.env`.
- The application must detect whether the user is already authenticated.
- If an existing valid session is available, it should reuse the saved session.
- The application must save the authenticated browser session for future runs.
- The application must navigate to the employee attendance page (`/me`).

## 3. HRMS Login

- HRMS credentials must be loaded from `.env`.
- Required environment variables:
  - `HRMS_EMAIL`
  - `HRMS_PASSWORD`
  - `HRMS_URL`
- The application must automatically fill the HRMS login credentials when login is required.
- The application must detect successful login before continuing.

## 4. OTP Verification

- If HRMS requires OTP verification, the automation must open Outlook in a separate browser tab.
- Outlook credentials must be configurable separately through `.env`.
- Required environment variables:
  - `OUTLOOK_EMAIL`
  - `OUTLOOK_PASSWORD`
- The application should automatically log in to Outlook when possible.
- The user must be able to manually complete Outlook/OTP verification if automatic login is unavailable.
- The automation must wait for the HRMS login to complete after OTP verification.
- OTP verification timeout should be 10 minutes.
- If OTP verification fails or times out, the automation must show a clear failure message.

## 5. Attendance Detection

- The application must detect the current attendance state from the HRMS page.
- If `Clock Out` is already available, the application should treat attendance as already marked.
- If `Clock In` is available, the application should attempt to mark attendance.
- The application must verify that the `Clock In` button exists before attempting to click it.
- The application must verify that the `Clock In` button is enabled.
- After clicking `Clock In`, the application must verify that attendance was successfully marked by checking for `Clock Out`.

## 6. Duplicate Attendance Prevention

- The application must maintain a daily execution state.
- The state must be stored in:
  - `state/last-run.json`
- The application must prevent unnecessary repeated attendance attempts after a successful run.
- Existing attendance should also be detected from the HRMS UI.

## 7. Success Result Page

After successful attendance:

- Display a browser result page.
- Show a clear success message.
- Show the attendance time.
- Example:
  - `Attendance Marked Successfully`
  - `Your attendance has been marked.`
- The success page must remain open so the user can see the result.
- A successful result must not show a `Try Again` button.

## 8. Failure Result Page

If attendance cannot be marked:

- Display a clear failure page.
- Explain that attendance was not marked.
- Show the reason when available.
- Provide a `Try Again` button.
- Clicking `Try Again` must retry the attendance process without requiring the application to be restarted manually.
- The browser should remain open while waiting for the user's decision.

## 9. Retry Mechanism

- The automation must support repeated retry attempts.
- Retries must happen within the same browser session/page where possible.
- A failed attempt must not automatically terminate the application.
- The user must be able to retry from the result page.

## 10. Test Mode

- The application must support a test mode that bypasses the normal attendance time restriction.
- Test mode must be enabled using:

  `TEST_MODE=true`

- When `TEST_MODE=true`, the application can be manually executed at any time for testing.
- Normal production execution must still enforce the attendance time window.
- Testing must use the same `.env` credentials and saved session as the production automation.

## 11. Separate Test Runner

- A separate `test-attendance.js` file must be available for testing.
- The test runner must:
  - Enable `TEST_MODE`.
  - Import `startAttendance()` from `attendance.js`.
  - Explicitly execute `startAttendance()`.
- `attendance.js` must export:

  `startAttendance`

- `attendance.js` must only automatically execute `startAttendance()` when it is run directly.
- This allows the main automation and test automation to share the same code.

## 12. Environment Configuration

Sensitive credentials must not be hard-coded in JavaScript.

The `.env` file must contain:

- `HRMS_EMAIL`
- `HRMS_PASSWORD`
- `HRMS_URL`
- `OUTLOOK_EMAIL`
- `OUTLOOK_PASSWORD`

The application must load environment variables using `dotenv`.

Credential files and authentication/session data must not be committed to Git.

## 13. Browser Automation

- Browser automation must use Playwright.
- The browser must run in visible mode (`headless: false`) so the user can observe the automation.
- The current implementation uses Playwright Chromium.
- The browser session must support multiple tabs/pages because Outlook may need to be opened separately from HRMS.

## 14. Error Handling

The application must handle:

- HRMS login failure.
- Invalid/missing credentials.
- OTP verification timeout.
- Outlook login failure.
- Missing Clock In button.
- Disabled Clock In button.
- Attendance marking failure.
- Existing attendance.
- Unexpected HRMS page state.
- Browser/page errors.

Errors should be displayed clearly to the user and logged in the terminal.

## 15. Systemd Integration

The application must run automatically using:

- `attendance-automator.service`
- `attendance-automator.timer`

The timer must trigger the attendance automation at approximately 08:30 AM.

The service should execute the Node.js attendance automation.

The automation should be independently testable using:

```bash
node test-attendance.js