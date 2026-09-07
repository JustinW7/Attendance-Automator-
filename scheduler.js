require('dotenv').config();

const { startAttendance } = require('./attendance');
const fs = require('fs');

const START_HOUR = 8;
const START_MINUTE = 30;

const END_HOUR = 9;
const END_MINUTE = 30;

const STATE_DIR = 'state';
const STATE_FILE = `${STATE_DIR}/last-run.json`;

let automationRunning = false;

function isWeekday() {
    const day = new Date().getDay();

    // Sunday = 0
    // Monday = 1
    // ...
    // Saturday = 6

    return day >= 1 && day <= 6;
}

function isWithinAttendanceWindow() {
    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

    const startMinutes =
        START_HOUR * 60 + START_MINUTE;

    const endMinutes =
        END_HOUR * 60 + END_MINUTE;

    return (
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes
    );
}

function getTodayString() {
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

        return state.lastRunDate === getTodayString();
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
                lastRunDate: getTodayString()
            },
            null,
            2
        )
    );
}

async function checkAndRun() {
    if (automationRunning) {
        return;
    }

    if (!isWeekday()) {
        return;
    }

    if (!isWithinAttendanceWindow()) {
        return;
    }

    if (hasRunToday()) {
        return;
    }

    automationRunning = true;

    console.log('');
    console.log('=================================');
    console.log('Attendance window reached');
    console.log(
        'Time:',
        new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        })
    );
    console.log('=================================');

    try {
        await startAttendance();

        // Mark the day as completed after the automation finishes.
        markRunToday();

        console.log('✅ Today\'s attendance automation completed.');
    } catch (error) {
        console.error(
            '❌ Attendance automation failed:',
            error.message
        );
    } finally {
        automationRunning = false;
    }
}

function startScheduler() {
    console.log('');
    console.log('=================================');
    console.log('Attendance Automator');
    console.log('Window: Monday–Saturday');
    console.log('Time: 08:30 AM – 09:30 AM');
    console.log(
        'Started:',
        new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        })
    );
    console.log('=================================');

    // Check every 30 seconds.
    checkAndRun();

    setInterval(checkAndRun, 30000);
}

startScheduler();