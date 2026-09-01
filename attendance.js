require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');

const HRMS_URL =
    process.env.HRMS_URL || 'https://nexpeople.cygnoz.com/me';

const AUTH_FILE = 'auth/session.json';

async function startAttendance() {
    const now = new Date();

    console.log('=================================');
    console.log('Starting Attendance Automator');
    console.log(now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata'
    }));
    console.log('=================================');

    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext(
        fs.existsSync(AUTH_FILE)
            ? { storageState: AUTH_FILE }
            : {}
    );

    const page = await context.newPage();

    try {
        // ------------------------------------------------
        // OPEN NEXPEOPLE
        // ------------------------------------------------

        console.log('Opening NexPeople...');

        await page.goto(HRMS_URL, {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        console.log('Current URL:', page.url());

        // ------------------------------------------------
        // LOGIN IF SESSION HAS EXPIRED
        // ------------------------------------------------

        if (page.url().includes('/login')) {
            console.log('Login required.');

            const inputs = page.locator('input');

            await inputs.nth(0).fill(process.env.HRMS_EMAIL);
            await inputs.nth(1).fill(process.env.HRMS_PASSWORD);

            console.log('Email and password entered.');

            await page.getByRole('button', { name: 'Login' }).click();

            console.log('Login clicked.');
            console.log('Waiting for OTP/login...');

            // Allow OTP page to appear.
            await page.waitForTimeout(3000);

            // --------------------------------------------
            // OPEN OUTLOOK IN NEW TAB
            // --------------------------------------------

            const outlookPage = await context.newPage();

            console.log('Opening Outlook in a new tab...');

            await outlookPage.goto(
                'https://outlook.office.com/mail/',
                {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                }
            );

            console.log('');
            console.log('=================================');
            console.log('🔐 OTP REQUIRED');
            console.log('=================================');
            console.log('Outlook has been opened in a new tab.');
            console.log('Open the latest NexPeople OTP email.');
            console.log('Copy the OTP and enter it in the NexPeople tab.');
            console.log('Waiting up to 10 minutes...');
            console.log('=================================');

            // --------------------------------------------
            // WAIT FOR LOGIN TO COMPLETE
            // --------------------------------------------

            await page.waitForURL(
                url => !url.toString().includes('/login'),
                {
                    timeout: 600000
                }
            );

            console.log('✅ Login successful.');

            // Close Outlook tab after authentication
            await outlookPage.close();

            // Save new authenticated session
            await context.storageState({
                path: AUTH_FILE
            });

            console.log('✅ Session saved.');
        } else {
            console.log('✅ Existing NexPeople session is valid.');

            // Refresh the saved session
            await context.storageState({
                path: AUTH_FILE
            });
        }

        // ------------------------------------------------
        // OPEN ME
        // ------------------------------------------------

        await page.goto(
            'https://nexpeople.cygnoz.com/me',
            {
                waitUntil: 'networkidle',
                timeout: 60000
            }
        );

        console.log('Me page loaded:', page.url());

        // ------------------------------------------------
        // CHECK ATTENDANCE STATE
        // ------------------------------------------------

        const clockOutButton = page.locator('button').filter({
            hasText: /^Clock Out$/
        }).first();

        const clockInButton = page.locator('button').filter({
            hasText: /^Clock In$/
        }).first();

        // Already working
        if (await clockOutButton.count() > 0) {
            console.log('Already clocked in.');
            console.log('No action taken.');
            return;
        }

        // Clock In available
        if (await clockInButton.count() === 0) {
            console.log('❌ Clock In button not found.');
            return;
        }

        if (!(await clockInButton.isVisible())) {
            console.log('❌ Clock In button is not visible.');
            return;
        }

        if (!(await clockInButton.isEnabled())) {
            console.log('❌ Clock In button is disabled.');
            return;
        }

        // ------------------------------------------------
        // CLOCK IN
        // ------------------------------------------------

        console.log('Clock In button found.');
        console.log('Clicking Clock In...');

        await clockInButton.click();

        console.log('✅ Clock In clicked.');

        // Give NexPeople time to update.
        await page.waitForTimeout(3000);

        console.log('Attendance automation completed.');
    }

    catch (error) {
        console.error('');
        console.error('❌ Attendance automation failed:');
        console.error(error.message);
    }

    finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

if (require.main === module) {
    startAttendance();
}

module.exports = {
    startAttendance
};