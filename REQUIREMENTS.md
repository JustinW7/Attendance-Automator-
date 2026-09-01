## NexPeople Attendance Automator — Project Requirement

Build a **single-user local attendance automation app** for the NexPeople HRMS website.

### Objective

Automatically mark my attendance by clicking **Clock In exactly at 9:00 AM, Monday–Saturday**, without requiring me to manually open NexPeople every morning.

### Current NexPeople workflow

```text
NexPeople
→ Login with Email + Password
→ OTP from Outlook when required
→ ME module
→ Clock In
```

After successful login, NexPeople keeps the authenticated session for a period of time, so OTP is not required on every login.

### Required workflow

```text
Computer starts
→ Automation runs in background
→ Wait until 9:00 AM
→ Monday–Saturday only
→ Open NexPeople
→ Reuse saved authenticated session
→ Open /me
→ Check attendance state
→ If "Clock In" is available → click once
→ If already "Clock Out" → do nothing
→ Close browser
```

### Session-expiry workflow

When the saved NexPeople session is no longer valid:

```text
9:00 AM
→ Open NexPeople
→ Email automatically entered
→ Password automatically entered
→ NexPeople requests OTP
→ Open Outlook automatically in a new browser tab
→ User manually reads OTP from Outlook
→ User enters OTP in NexPeople
→ Login succeeds
→ Save the new authenticated session
→ Open /me
→ Click Clock In
→ Close browser
```

The application **must not bypass or automatically extract the OTP**.

### Attendance behavior

The application is responsible only for the **9:00 AM Clock In**.

After Clock In:

```text
Working
→ User manually clicks Clock Out for a break
→ User manually clicks Clock In after returning
```

The automation must **not interfere with breaks or repeatedly click Clock In/Clock Out**.

### Safety requirements

Before clicking:

```text
If Clock In exists → click
If Clock Out exists → do nothing
If neither exists → log an error and stop
```

The automation must avoid accidental duplicate clicks.

### Technology

* **Frontend:** React (optional for the first version)
* **Backend/runtime:** Node.js
* **Automation:** Playwright
* **Configuration:** `.env`
* **Authentication session:** Playwright `storageState`
* **Scheduler:** Node.js scheduler
* **OS automation:** Linux systemd user service
* **Database:** Not required
* **Multi-user:** Not required
* **Cloud:** Not required

### Current implementation status

Already implemented and tested:

* NexPeople access
* Automatic email/password entry
* OTP login
* Session persistence
* Session reuse
* `/me` navigation
* Clock In detection
* Clock In automation
* Monday–Saturday scheduling
* 9:00 AM scheduling
* Linux background service
* Automatic startup after Linux login

### Future improvements

* Better OTP/session-expiry detection
* Automatic Outlook tab handling refinement
* Retry/recovery if NexPeople or network is unavailable
* Persistent local attendance logs
* Optional React dashboard for manually viewing status and configuration
* Packaging the application so another user can configure their own `.env` without modifying the source code



------------------------
i will say the full story here , 
 

i will be taking nexpeople and login with otp from outlook 

then you donot need to type again the otp once login for like 72 hours i guess , after that only you need to paste otp , 

in me module i want to press clock in button exactly at 9 am from monday to saturday ,once clicked the clock in button will change to clock out  if i want to take any break i want to click the clock out button, 

the productive time showing is the time i am working for the day , if i did't clock out or i did't have any break time , the website will automatically will clock out at 6 pm 

so my requirement is everyday at 9 am i want to automatically login at nexpeople with / without otp and mark my attendance this is a single button click for the day . 