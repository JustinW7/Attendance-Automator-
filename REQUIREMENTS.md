Absolutely. Here’s a clean **`.md` requirement summary** you can directly save as `REQUIREMENTS.md`:

````markdown
# Attendance Automation – Requirements

## 1. Objective

Build an automated attendance-marking system that runs automatically every day at the scheduled time, opens the required attendance website in Firefox, handles OTP verification when required, and provides a clear success or failure indication.

---

## 2. Automatic Scheduling

- The application must run automatically using a Linux `systemd --user` timer.
- Scheduled execution time: **8:30 AM IST every day**.
- The timer must start automatically when the user logs in.
- The application must be restartable using:

```bash
systemctl --user restart attendance-automator.timer
````

* The timer status can be verified using:

```bash
systemctl --user list-timers --all attendance-automator.timer
```

---

## 3. Attendance Automation Flow

When the scheduled service starts:

1. Launch the attendance automation.
2. Open the attendance website in a **new Firefox tab**.
3. Navigate through the required attendance flow.
4. Detect whether OTP verification is required.
5. If OTP is required:

   * Open/access Outlook in a **new Firefox tab**.
   * Retrieve the required OTP.
   * Use the OTP in the attendance website.
6. Complete the attendance-marking process.
7. Determine whether attendance was successfully marked.

---

## 4. Browser Requirements

* Firefox must be used.
* The attendance website should open in a **new tab**, rather than unnecessarily replacing an existing browser window.
* If Outlook is required for OTP retrieval, it should also open in a **new tab**.
* Existing Firefox sessions should not be unnecessarily closed.

---

## 5. Success Behaviour

If attendance is successfully marked:

* Show a clear success message.
* Display:

> **🎉 Congrats! Your attendance is marked.**

* The success message should preferably appear in a **green modal/popup box** in the browser.
* The user should be able to immediately understand that attendance was successfully completed.

Example:

```text
┌──────────────────────────────────────┐
│          🎉 SUCCESS                  │
│                                      │
│  Congrats! Your attendance is        │
│  marked successfully.                │
│                                      │
│              [ OK ]                  │
└──────────────────────────────────────┘
```

---

## 6. Failure Behaviour

If attendance cannot be marked:

* Show a clear failure message in a browser tab/modal.
* Display:

> **Sorry, your attendance is not marked.**

* The message should explain that the automation was unsuccessful where possible.
* The failure state should be visually distinct from the success state.

Example:

```text
┌──────────────────────────────────────┐
│          ❌ ATTENDANCE FAILED         │
│                                      │
│  Sorry, your attendance is not       │
│  marked.                              │
│                                      │
│              [ OK ]                  │
└──────────────────────────────────────┘
```

---

## 7. OTP Handling

The system must:

* Detect when OTP verification is required.
* Open Outlook in a new Firefox tab when necessary.
* Retrieve the latest OTP.
* Enter the OTP into the attendance page.
* Continue the attendance process after successful OTP verification.
* Handle OTP retrieval failure gracefully.

If OTP cannot be obtained:

```text
Sorry, your attendance is not marked.
Reason: OTP could not be retrieved.
```

---

## 8. Error Handling

The automation should gracefully handle:

* Attendance website not loading.
* Internet/network failure.
* Firefox not running.
* Website timeout.
* Login/session expiry.
* OTP not received.
* Incorrect/expired OTP.
* Attendance already marked.
* Unexpected website changes.
* Automation/script errors.

The user should receive a clear failure message instead of the application silently failing.

---

## 9. Logging

The system should maintain useful logs for troubleshooting.

Logs should indicate:

* Automation started.
* Attendance website opened.
* Login status.
* OTP required/not required.
* Outlook opened.
* OTP retrieved.
* OTP entered.
* Attendance submission started.
* Attendance successfully marked.
* Attendance failed.
* Reason for failure.

Logs can be viewed using:

```bash
journalctl --user -u attendance-automator.service -n 50 --no-pager
```

---

## 10. Code Validation

Before running the automation, JavaScript syntax should be validated using:

```bash
node --check ~/attendance-automation/attendance.js
```

The command must complete without syntax errors.

---

## 11. systemd Configuration

Required components:

### Service

```text
attendance-automator.service
```

Responsible for executing the Node.js automation.

### Timer

```text
attendance-automator.timer
```

Responsible for triggering the service every day at **08:30 AM IST**.

Both should be enabled:

```bash
systemctl --user is-enabled attendance-automator.service
systemctl --user is-enabled attendance-automator.timer
```

Expected result:

```text
enabled
enabled
```

---

## 12. Current Status

The system currently has:

* `attendance-automator.service` → **enabled** ✅
* `attendance-automator.timer` → **enabled** ✅
* JavaScript syntax check → **passed** ✅
* Timer successfully restarted → **yes** ✅
* Next scheduled execution → **08:30 AM IST, September 4, 2026** ✅

The remaining validation is to confirm that the actual attendance automation successfully completes the browser, OTP, and attendance-marking workflow during execution.

---

## 13. Primary Success Criteria

The project is considered successful when:

* [ ] systemd timer runs automatically every day at 8:30 AM.
* [ ] Firefox opens the attendance website in a new tab.
* [ ] Attendance login/flow works automatically.
* [ ] OTP is detected when required.
* [ ] Outlook opens in a new tab when OTP is required.
* [ ] OTP is retrieved correctly.
* [ ] OTP is entered successfully.
* [ ] Attendance is submitted.
* [ ] Successful attendance displays a green success modal.
* [ ] Failed attendance displays a clear failure modal.
* [ ] Errors are logged.
* [ ] The system does not silently fail.
* [ ] Existing Firefox tabs/windows are not unnecessarily closed.

---

# End Goal

The final experience should be:

**8:30 AM → Automation starts → Firefox opens attendance → OTP handled if required → Attendance submitted → User sees clear SUCCESS or FAILURE result.**

```
```
