require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HRMS_URL =
    process.env.HRMS_URL || 'https://nexpeople.cygnoz.com/me';

const AUTH_FILE = 'auth/session.json';

const STATE_DIR = 'state';
const STATE_FILE = path.join(STATE_DIR, 'last-run.json');

const OUTLOOK_URL = 'https://outlook.office.com/mail/';

// ======================================================
// DATE / STATE
// ======================================================

function getToday() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
}

function hasRunToday() {
    if (!fs.existsSync(STATE_FILE)) {
        return false;
    }

    try {
        const state = JSON.parse(
            fs.readFileSync(STATE_FILE, 'utf8')
        );

        return state.lastRunDate === getToday();
    } catch {
        return false;
    }
}

function markRunToday() {
    fs.mkdirSync(STATE_DIR, {
        recursive: true
    });

    fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(
            {
                lastRunDate: getToday()
            },
            null,
            2
        )
    );
}

// ======================================================
// TIME WINDOW
// ======================================================

function isWithinAttendanceWindow() {
    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

    const startMinutes = 8 * 60 + 30; // 08:30
    const endMinutes = 9 * 60 + 30;   // 09:30

    return (
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
    );
}

// ======================================================
// FIREFOX RESULT PAGE
// ======================================================

function showFirefoxResult({
    success,
    title,
    message,
    time
}) {
    try {
        fs.mkdirSync(STATE_DIR, {
            recursive: true
        });

        const htmlFile = path.resolve(
            STATE_DIR,
            'attendance-result.html'
        );

        const background = success
            ? '#16a34a'
            : '#dc2626';

        const icon = success
            ? '✓'
            : '✕';

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Attendance Automator</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            background: #f3f4f6;
        }

        .card {
            width: 520px;
            max-width: 90%;
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }

        .icon {
            width: 90px;
            height: 90px;
            margin: 0 auto 25px;
            border-radius: 50%;
            background: ${background};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 55px;
            font-weight: bold;
        }

        h1 {
            margin: 0 0 15px;
            font-size: 30px;
            color: #111827;
        }

        p {
            margin: 10px 0;
            color: #4b5563;
            font-size: 17px;
            line-height: 1.6;
        }

        .time {
            margin-top: 25px;
            font-weight: bold;
            color: #111827;
        }

        .status {
            margin-top: 25px;
            padding: 12px;
            border-radius: 10px;
            background: #f3f4f6;
            color: #374151;
        }
    </style>
</head>

<body>
    <div class="card">

        <div class="icon">${icon}</div>

        <h1>${title}</h1>

        <p>${message}</p>

        ${
            time
                ? `<div class="time">Time: ${time}</div>`
                : ''
        }

        <div class="status">
            Attendance Automator
        </div>

    </div>
</body>
</html>
`;

        fs.writeFileSync(
            htmlFile,
            html,
            'utf8'
        );

        const fileUrl =
            `file://${htmlFile}`;

        console.log(
            success
                ? 'Opening Firefox success page...'
                : 'Opening Firefox failure page...'
        );

        // Try Firefox first.
        const firefox = spawn(
            'firefox',
            ['--new-tab', fileUrl],
            {
                detached: true,
                stdio: 'ignore'
            }
        );

        firefox.unref();

    } catch (error) {
        console.error(
            'Could not open Firefox result page:',
            error.message
        );
    }
}

// ======================================================
// MAIN ATTENDANCE FUNCTION
// ======================================================

async function startAttendance() {

    // --------------------------------------------------
    // TIME WINDOW
    // --------------------------------------------------

    if (!isWithinAttendanceWindow()) {

        console.log(
            `Outside attendance window (${new Date().toLocaleTimeString()}).`
        );

        console.log(
            'No attendance action taken.'
        );

        return;
    }

    // --------------------------------------------------
    // ALREADY PROCESSED TODAY
    // --------------------------------------------------

    if (hasRunToday()) {

        console.log(
            "Today's attendance has already been processed."
        );

        return;
    }

    const startTime =
        new Date().toLocaleTimeString(
            'en-IN',
            {
                timeZone: 'Asia/Kolkata'
            }
        );

    console.log('');
    console.log('=================================');
    console.log('Starting Attendance Automator');
    console.log(startTime);
    console.log('=================================');

    let browser = null;

    try {

        // --------------------------------------------------
        // START BROWSER
        // --------------------------------------------------

        browser = await chromium.launch({
            headless: false
        });

        const context = await browser.newContext(
            fs.existsSync(AUTH_FILE)
                ? {
                    storageState: AUTH_FILE
                }
                : {}
        );

        const page = await context.newPage();

        // --------------------------------------------------
        // OPEN NEXPEOPLE
        // --------------------------------------------------

        console.log(
            'Opening NexPeople...'
        );

        await page.goto(
            HRMS_URL,
            {
                waitUntil: 'networkidle',
                timeout: 60000
            }
        );

        console.log(
            'Current URL:',
            page.url()
        );

        // --------------------------------------------------
        // LOGIN IF SESSION EXPIRED
        // --------------------------------------------------

        if (
            page.url().includes('/login')
        ) {

            console.log(
                'Login required.'
            );

            const inputs =
                page.locator('input');

            if (
                await inputs.count() < 2
            ) {
                throw new Error(
                    'NexPeople login fields were not found.'
                );
            }

            await inputs
                .nth(0)
                .fill(
                    process.env.HRMS_EMAIL
                );

            await inputs
                .nth(1)
                .fill(
                    process.env.HRMS_PASSWORD
                );

            console.log(
                'Email and password entered.'
            );

            await page
                .getByRole(
                    'button',
                    {
                        name: 'Login'
                    }
                )
                .click();

            console.log(
                'Login clicked.'
            );

            console.log(
                'Checking whether OTP is required...'
            );

            await page.waitForTimeout(
                3000
            );

            // --------------------------------------------------
            // OPEN OUTLOOK IN NEW TAB
            // --------------------------------------------------

            const outlookPage =
                await context.newPage();

            console.log(
                'Opening Outlook in a new tab...'
            );

            await outlookPage.goto(
                OUTLOOK_URL,
                {
                    waitUntil:
                        'domcontentloaded',
                    timeout: 60000
                }
            );

            console.log('');
            console.log('=================================');
            console.log('🔐 OTP REQUIRED');
            console.log('=================================');
            console.log(
                'Outlook is open in another tab.'
            );
            console.log(
                'Open the latest NexPeople OTP email.'
            );
            console.log(
                'Enter the OTP in the NexPeople tab.'
            );
            console.log(
                'Waiting up to 10 minutes...'
            );
            console.log('=================================');

            // --------------------------------------------------
            // WAIT FOR LOGIN
            // --------------------------------------------------

            await page.waitForURL(
                url =>
                    !url
                        .toString()
                        .includes('/login'),
                {
                    timeout: 600000
                }
            );

            console.log(
                '✅ Login successful.'
            );

            await context.storageState({
                path: AUTH_FILE
            });

            console.log(
                '✅ New session saved.'
            );

            await outlookPage.close();

        } else {

            console.log(
                '✅ Existing NexPeople session is valid.'
            );
        }

        // --------------------------------------------------
        // OPEN ME
        // --------------------------------------------------

        await page.goto(
            'https://nexpeople.cygnoz.com/me',
            {
                waitUntil: 'networkidle',
                timeout: 60000
            }
        );

        console.log(
            'Me page loaded:',
            page.url()
        );

        // --------------------------------------------------
        // ATTENDANCE STATE
        // --------------------------------------------------

        const clockOutButton =
            page
                .locator('button')
                .filter({
                    hasText: /^Clock Out$/
                })
                .first();

        const clockInButton =
            page
                .locator('button')
                .filter({
                    hasText: /^Clock In$/
                })
                .first();

        // --------------------------------------------------
        // ALREADY CLOCKED IN
        // --------------------------------------------------

        if (
            await clockOutButton.count() > 0
        ) {

            console.log(
                'Already clocked in.'
            );

            console.log(
                'Attendance is already marked.'
            );

            markRunToday();

            showFirefoxResult({
                success: true,
                title:
                    'Attendance Already Marked',
                message:
                    'Your attendance is already marked for today.',
                time: startTime
            });

            return;
        }

        // --------------------------------------------------
        // CLOCK IN NOT FOUND
        // --------------------------------------------------

        if (
            await clockInButton.count() === 0
        ) {
            throw new Error(
                'Clock In button was not found.'
            );
        }

        if (
            !(await clockInButton.isVisible())
        ) {
            throw new Error(
                'Clock In button is not visible.'
            );
        }

        if (
            !(await clockInButton.isEnabled())
        ) {
            throw new Error(
                'Clock In button is disabled.'
            );
        }

        // --------------------------------------------------
        // CLOCK IN
        // --------------------------------------------------

        console.log(
            'Clock In button found.'
        );

        console.log(
            'Clicking Clock In...'
        );

        await clockInButton.click();

        console.log(
            'Clock In clicked.'
        );

        // --------------------------------------------------
        // VERIFY STATE CHANGED
        // --------------------------------------------------

        console.log(
            'Verifying attendance status...'
        );

        await page.waitForTimeout(
            3000
        );

        try {

            await page
                .locator('button')
                .filter({
                    hasText: /^Clock Out$/
                })
                .first()
                .waitFor({
                    state: 'visible',
                    timeout: 10000
                });

        } catch {

            throw new Error(
                'Clock In was clicked, but NexPeople did not change to Clock Out. Attendance could not be confirmed.'
            );
        }

        console.log(
            '✅ NexPeople now shows Clock Out.'
        );

        console.log(
            '✅ Attendance successfully verified.'
        );

        // --------------------------------------------------
        // SAVE SUCCESS
        // --------------------------------------------------

        markRunToday();

        console.log(
            '✅ Today marked as completed.'
        );

        // --------------------------------------------------
        // SHOW SUCCESS IN FIREFOX
        // --------------------------------------------------

        showFirefoxResult({
            success: true,
            title:
                'Congrats! Attendance Marked',
            message:
                'Your attendance has been successfully marked for today.',
            time: startTime
        });

    } catch (error) {

        console.error('');
        console.error(
            '❌ Attendance automation failed:'
        );
        console.error(
            error.message
        );

        // --------------------------------------------------
        // SHOW FAILURE IN FIREFOX
        // --------------------------------------------------

        showFirefoxResult({
            success: false,
            title:
                'Sorry, Attendance Not Marked',
            message:
                `Your attendance was not marked. ${error.message}`,
            time: new Date().toLocaleTimeString(
                'en-IN',
                {
                    timeZone:
                        'Asia/Kolkata'
                }
            )
        });

    } finally {

        if (browser) {
            await browser.close();
        }

        console.log(
            'Browser closed.'
        );
    }
}

// ======================================================
// START
// ======================================================

if (
    require.main === module
) {
    startAttendance();
}

module.exports = {
    startAttendance
};