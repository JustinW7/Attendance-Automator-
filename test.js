require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');

const HRMS_URL = process.env.HRMS_URL || 'https://nexpeople.cygnoz.com/me';
const AUTH_FILE = 'auth/session.json';

async function startAttendance() {
    console.log('\n=================================');
    console.log('Starting attendance automation');
    console.log(new Date().toString());
    console.log('=================================\n');

    const browser = await chromium.launch({
        headless: false
    });

    const contextOptions = fs.existsSync(AUTH_FILE)
        ? { storageState: AUTH_FILE }
        : {};

    const context = await browser.newContext(contextOptions);

    const page = await context.newPage();

    try {
        console.log('Opening NexPeople...');

        await page.goto(HRMS_URL, {
            waitUntil: 'networkidle'
        });

        console.log('Current URL:', page.url());

        // --------------------------------------------------
        // LOGIN
        // --------------------------------------------------

        if (page.url().includes('/login')) {
            console.log('Login required.');

            const inputs = page.locator('input');

            await inputs.nth(0).fill(process.env.HRMS_EMAIL);
            await inputs.nth(1).fill(process.env.HRMS_PASSWORD);

            console.log('Email and password entered.');

            await page.getByRole('button', { name: 'Login' }).click();

            console.log('Login clicked.');
            console.log('Waiting for OTP if required...');

            // Wait up to 2 minutes for successful login.
            await page.waitForURL(
                url => !url.toString().includes('/login'),
                {
                    timeout: 120000
                }
            );

            console.log('Login successful.');
        }

        // --------------------------------------------------
        // SAVE SESSION
        // --------------------------------------------------

        await context.storageState({
            path: AUTH_FILE
        });

        console.log('Session saved.');

        // --------------------------------------------------
        // CLOCK IN
        // --------------------------------------------------

        await page.goto('https://nexpeople.cygnoz.com/me', {
            waitUntil: 'networkidle'
        });

        console.log('Me page loaded.');

        const clockInButton = page.locator('button').filter({
            hasText: /^Clock In$/
        }).first();

        const clockOutButton = page.locator('button').filter({
            hasText: /^Clock Out$/
        }).first();

        if (await clockOutButton.count() > 0) {
            console.log('Already clocked in. No action taken.');
            return;
        }

        if (await clockInButton.count() === 0) {
            console.log('Clock In button not found.');
            return;
        }

        if (!(await clockInButton.isVisible())) {
            console.log('Clock In button is not visible.');
            return;
        }

        if (!(await clockInButton.isEnabled())) {
            console.log('Clock In button is disabled.');
            return;
        }

        console.log('Clock In button found.');
        console.log('Clicking Clock In...');

        await clockInButton.click();

        console.log('✅ Clock In clicked successfully.');

        // Give NexPeople time to update.
        await page.waitForTimeout(3000);

        console.log('Attendance automation completed.');

    } catch (error) {
        console.error('❌ Automation error:', error.message);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

startAttendance();