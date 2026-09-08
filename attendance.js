require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

    const startMinutes = 8 * 60 + 30;
    const endMinutes = 9 * 60 + 30;

    return (
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
    );
}

// ======================================================
// TIME
// ======================================================

function getCurrentTime() {
    return new Date().toLocaleTimeString(
        'en-IN',
        {
            timeZone: 'Asia/Kolkata'
        }
    );
}

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ======================================================
// RESULT PAGE
// ======================================================

async function showResultPage(
    page,
    {
        success,
        title,
        message,
        time,
        retryAvailable = false
    }
) {
    const background = success
        ? '#16a34a'
        : '#dc2626';

    const icon = success
        ? '✓'
        : '✕';

    const button = retryAvailable
        ? `
            <button id="tryAgain">
                ↻ Try Again
            </button>
        `
        : '';

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

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background:
                #f3f4f6;
        }

        .card {

            width: 520px;

            max-width: 90%;

            background: white;

            border-radius: 22px;

            padding:
                50px 40px;

            text-align: center;

            box-shadow:
                0 20px 60px
                rgba(0,0,0,0.15);
        }

        .icon {

            width: 90px;
            height: 90px;

            margin:
                0 auto 25px;

            border-radius: 50%;

            background:
                ${background};

            color: white;

            display: flex;

            align-items: center;
            justify-content: center;

            font-size: 55px;

            font-weight: bold;
        }

        h1 {

            margin:
                0 0 15px;

            font-size: 30px;

            color:
                #111827;
        }

        p {

            margin:
                10px 0;

            color:
                #4b5563;

            font-size: 17px;

            line-height: 1.6;
        }

        .reason {

            margin-top: 20px;

            padding: 15px;

            border-radius: 10px;

            background:
                #f9fafb;

            color:
                #374151;

            font-size: 15px;

            line-height: 1.5;
        }

        .time {

            margin-top: 25px;

            font-weight: bold;

            color:
                #111827;
        }

        button {

            margin-top: 28px;

            padding:
                14px 28px;

            border: none;

            border-radius: 10px;

            background:
                #2563eb;

            color: white;

            font-size: 17px;

            font-weight: bold;

            cursor: pointer;

            transition:
                transform 0.15s,
                opacity 0.15s;
        }

        button:hover {

            opacity: 0.9;

            transform:
                translateY(-1px);
        }

        button:active {

            transform:
                translateY(0);
        }

        .status {

            margin-top: 28px;

            padding: 12px;

            border-radius: 10px;

            background:
                #f3f4f6;

            color:
                #374151;

            font-size: 14px;
        }

        .retry-info {

            margin-top: 12px;

            font-size: 13px;

            color:
                #6b7280;
        }

    </style>

</head>

<body>

    <div class="card">

        <div class="icon">
            ${icon}
        </div>

        <h1>
            ${escapeHtml(title)}
        </h1>

        <p>
            ${
                success
                    ? escapeHtml(message)
                    : 'Your attendance was not marked.'
            }
        </p>

        ${
            !success
                ? `
                    <div class="reason">
                        ${escapeHtml(message)}
                    </div>
                `
                : ''
        }

        ${
            time
                ? `
                    <div class="time">
                        Time: ${escapeHtml(time)}
                    </div>
                `
                : ''
        }

        ${button}

        ${
            retryAvailable
                ? `
                    <div class="retry-info">
                        You can retry the attendance process
                        from this tab.
                    </div>
                `
                : ''
        }

        <div class="status">
            Attendance Automator
        </div>

    </div>

</body>
</html>
`;

    await page.setContent(html);

    // --------------------------------------------------
    // WAIT FOR TRY AGAIN
    // --------------------------------------------------

    if (retryAvailable) {

        await page
            .locator('#tryAgain')
            .waitFor({
                state: 'visible'
            });

        await page
            .locator('#tryAgain')
            .click();

        console.log('');
        console.log(
            '🔄 Try Again clicked.'
        );

        console.log(
            'Restarting attendance process...'
        );

        return true;
    }

    return false;
}

// ======================================================
// OUTLOOK LOGIN
// ======================================================

async function handleOutlookLogin(outlookPage) {

    console.log('');
    console.log(
        'Checking Outlook login...'
    );

    // --------------------------------------------------
    // WAIT FOR INITIAL OUTLOOK PAGE
    // --------------------------------------------------

    await outlookPage.waitForTimeout(3000);

    // --------------------------------------------------
    // EMAIL
    // --------------------------------------------------

    const emailInput =
        outlookPage
            .locator(
                'input[type="email"], input[name="loginfmt"]'
            )
            .first();

    if (
        await emailInput.count() > 0 &&
        await emailInput.isVisible()
    ) {

        console.log(
            'Outlook email field found.'
        );

        if (!process.env.HRMS_EMAIL) {
            throw new Error(
                'HRMS_EMAIL is not configured in .env.'
            );
        }

        await emailInput.fill(
            process.env.OUTLOOK_EMAIL
        );

        console.log(
            '✅ Outlook email entered.'
        );

        const nextButton =
            outlookPage
                .getByRole(
                    'button',
                    {
                        name: /Next/i
                    }
                )
                .first();

        if (
            await nextButton.count() > 0 &&
            await nextButton.isVisible()
        ) {

            await nextButton.click();

            console.log(
                'Outlook Next clicked.'
            );

            await outlookPage.waitForTimeout(
                2000
            );
        }
    }

    // --------------------------------------------------
    // PASSWORD
    // --------------------------------------------------

    const passwordInput =
        outlookPage
            .locator(
                'input[type="password"], input[name="passwd"]'
            )
            .first();

    if (
        await passwordInput.count() > 0 &&
        await passwordInput.isVisible()
    ) {

        console.log(
            'Outlook password field found.'
        );

        if (!process.env.HRMS_PASSWORD) {
            throw new Error(
                'HRMS_PASSWORD is not configured in .env.'
            );
        }

        await passwordInput.fill(
            process.env.OUTLOOK_PASSWORD
        );

        console.log(
            '✅ Outlook password entered.'
        );

        const signInButton =
            outlookPage
                .getByRole(
                    'button',
                    {
                        name: /Sign in/i
                    }
                )
                .first();

        if (
            await signInButton.count() > 0 &&
            await signInButton.isVisible()
        ) {

            await signInButton.click();

            console.log(
                'Outlook Sign in clicked.'
            );

            await outlookPage.waitForTimeout(
                5000
            );
        }
    }

    // --------------------------------------------------
    // MICROSOFT "STAY SIGNED IN"
    // --------------------------------------------------

    try {

        const staySignedInButton =
            outlookPage
                .getByRole(
                    'button',
                    {
                        name: /Yes/i
                    }
                )
                .first();

        if (
            await staySignedInButton.count() > 0 &&
            await staySignedInButton.isVisible({
                timeout: 3000
            })
        ) {

            console.log(
                'Microsoft "Stay signed in" prompt found.'
            );

            await staySignedInButton.click();

            console.log(
                '✅ Stay signed in selected.'
            );

            await outlookPage.waitForTimeout(
                3000
            );
        }

    } catch {
        // No "Stay signed in" prompt.
    }

    // --------------------------------------------------
    // CHECK FINAL STATE
    // --------------------------------------------------

    console.log(
        'Outlook URL:',
        outlookPage.url()
    );

    console.log(
        'Outlook login check completed.'
    );
}

// ======================================================
// LOGIN
// ======================================================

async function handleLogin(
    page,
    context
) {

    if (
        !page.url().includes('/login')
    ) {

        console.log(
            '✅ Existing NexPeople session is valid.'
        );

        return;
    }

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

    // --------------------------------------------------
    // NEXPEOPLE EMAIL
    // --------------------------------------------------

    await inputs
        .nth(0)
        .fill(
            process.env.HRMS_EMAIL
        );

    // --------------------------------------------------
    // NEXPEOPLE PASSWORD
    // --------------------------------------------------

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

    await page.waitForTimeout(
        3000
    );

    // --------------------------------------------------
    // OPEN OUTLOOK
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

            timeout:
                60000
        }
    );

    // --------------------------------------------------
    // AUTOMATIC OUTLOOK LOGIN
    // --------------------------------------------------

    try {

        await handleOutlookLogin(
            outlookPage
        );

    } catch (error) {

        console.log('');
        console.log(
            '⚠️ Outlook automatic login could not be completed.'
        );

        console.log(
            error.message
        );

        console.log(
            'You can complete Outlook login manually.'
        );
    }

    // --------------------------------------------------
    // OTP INSTRUCTIONS
    // --------------------------------------------------

    console.log('');
    console.log(
        '================================='
    );

    console.log(
        '🔐 OTP / LOGIN VERIFICATION'
    );

    console.log(
        '================================='
    );

    console.log(
        'Outlook is open in another tab.'
    );

    console.log(
        'Find the latest NexPeople OTP email.'
    );

    console.log(
        'Enter the OTP in the NexPeople tab.'
    );

    console.log(
        'Waiting up to 10 minutes...'
    );

    console.log(
        '================================='
    );

    try {

        await page.waitForURL(
            url =>
                !url
                    .toString()
                    .includes('/login'),

            {
                timeout:
                    600000
            }
        );

    } catch {

        // --------------------------------------------------
        // OTP FAILURE
        // --------------------------------------------------

        console.log(
            '❌ OTP/login verification timed out.'
        );

        // IMPORTANT:
        // Do NOT close Outlook here.
        //
        // The browser remains open.
        // The failure page will provide Try Again.

        throw new Error(
            'OTP could not be verified within 10 minutes. Outlook remains open so you can check the OTP.'
        );
    }

    console.log(
        '✅ Login successful.'
    );

    await context.storageState({
        path: AUTH_FILE
    });

    console.log(
        '✅ New session saved.'
    );

    // --------------------------------------------------
    // CLOSE OUTLOOK AFTER SUCCESS
    // --------------------------------------------------

    if (
        !outlookPage.isClosed()
    ) {

        await outlookPage.close();

        console.log(
            'Outlook tab closed after successful login.'
        );
    }
}

// ======================================================
// SINGLE ATTENDANCE ATTEMPT
// ======================================================

async function runAttendanceAttempt(
    page,
    context
) {

    console.log('');
    console.log(
        '================================='
    );

    console.log(
        'Starting Attendance Attempt'
    );

    console.log(
        getCurrentTime()
    );

    console.log(
        '================================='
    );

    // --------------------------------------------------
    // OPEN NEXPEOPLE
    // --------------------------------------------------

    console.log(
        'Opening NexPeople...'
    );

    await page.goto(
        HRMS_URL,
        {
            waitUntil:
                'networkidle',

            timeout:
                60000
        }
    );

    console.log(
        'Current URL:',
        page.url()
    );

    // --------------------------------------------------
    // LOGIN
    // --------------------------------------------------

    await handleLogin(
        page,
        context
    );

    // --------------------------------------------------
    // OPEN ME
    // --------------------------------------------------

    await page.goto(
        HRMS_URL,
        {
            waitUntil:
                'networkidle',

            timeout:
                60000
        }
    );

    console.log(
        'Me page loaded:',
        page.url()
    );

    // --------------------------------------------------
    // WAIT FOR PAGE
    // --------------------------------------------------

    await page.waitForTimeout(
        2000
    );

    // --------------------------------------------------
    // ATTENDANCE BUTTONS
    // --------------------------------------------------

    const clockOutButton =
        page
            .locator('button')
            .filter({
                hasText:
                    /^Clock Out$/
            })
            .first();

    const clockInButton =
        page
            .locator('button')
            .filter({
                hasText:
                    /^Clock In$/
            })
            .first();

    // --------------------------------------------------
    // ALREADY CLOCKED IN
    // --------------------------------------------------

    if (
        await clockOutButton.count() > 0 &&
        await clockOutButton.isVisible()
    ) {

        console.log(
            'Already clocked in.'
        );

        markRunToday();

        return {
            success: true,

            title:
                'Attendance Already Marked',

            message:
                'Your attendance is already marked for today.'
        };
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
    // VERIFY
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
                hasText:
                    /^Clock Out$/
            })
            .first()
            .waitFor({
                state:
                    'visible',

                timeout:
                    10000
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

    markRunToday();

    return {
        success: true,

        title:
            'Congrats! Attendance Marked',

        message:
            'Your attendance has been successfully marked for today.'
    };
}

// ======================================================
// MAIN
// ======================================================

async function startAttendance() {

    // --------------------------------------------------
    // TIME WINDOW
    // --------------------------------------------------

   if (
    !process.env.TEST_MODE &&
    !isWithinAttendanceWindow()
) {

    console.log(
        `Outside attendance window (${getCurrentTime()}).`
    );

    console.log(
        'No attendance action taken.'
    );

    return;
}

    // --------------------------------------------------
    // ALREADY COMPLETED
    // --------------------------------------------------

    if (
        hasRunToday()
    ) {

        console.log(
            "Today's attendance has already been processed."
        );

        return;
    }

    let browser = null;

    try {

        // --------------------------------------------------
        // START BROWSER
        // --------------------------------------------------

        browser =
            await chromium.launch({
                headless: false
            });

        const context =
            await browser.newContext(
                fs.existsSync(AUTH_FILE)
                    ? {
                        storageState:
                            AUTH_FILE
                    }
                    : {}
            );

        // --------------------------------------------------
        // MAIN ATTENDANCE TAB
        // --------------------------------------------------

        const page =
            await context.newPage();

        console.log(
            'Attendance Firefox tab created.'
        );

        // --------------------------------------------------
        // RETRY LOOP
        // --------------------------------------------------

        while (true) {

            try {

                const result =
                    await runAttendanceAttempt(
                        page,
                        context
                    );

                // --------------------------------------------------
                // SUCCESS
                // --------------------------------------------------

                console.log(
                    'Showing success page...'
                );

                await showResultPage(
                    page,
                    {
                        success:
                            true,

                        title:
                            result.title,

                        message:
                            result.message,

                        time:
                            getCurrentTime(),

                        retryAvailable:
                            false
                    }
                );

                console.log('');
                console.log(
                    '================================='
                );

                console.log(
                    '🎉 ATTENDANCE SUCCESS'
                );

                console.log(
                    'Result page will remain open.'
                );

                console.log(
                    '================================='
                );

                // --------------------------------------------------
                // KEEP BROWSER OPEN
                // --------------------------------------------------

                await new Promise(
                    () => {}
                );

            } catch (error) {

                console.error('');
                console.error(
                    '❌ Attendance attempt failed:'
                );

                console.error(
                    error.message
                );

                // --------------------------------------------------
                // FAILURE PAGE
                // --------------------------------------------------

                const retry =
                    await showResultPage(
                        page,
                        {
                            success:
                                false,

                            title:
                                'Sorry, Attendance Not Marked',

                            message:
                                error.message,

                            time:
                                getCurrentTime(),

                            retryAvailable:
                                true
                        }
                    );

                if (retry) {

                    console.log('');
                    console.log(
                        '================================='
                    );

                    console.log(
                        '🔄 RETRYING ATTENDANCE'
                    );

                    console.log(
                        'Same Firefox tab will be reused.'
                    );

                    console.log(
                        '================================='
                    );

                    continue;
                }
            }
        }

    } catch (error) {

        console.error(
            'Fatal automation error:',
            error.message
        );

    } finally {

        // --------------------------------------------------
        // DO NOT CLOSE BROWSER
        // --------------------------------------------------

        console.log(
            'Attendance Automator finished its active work.'
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