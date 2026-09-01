require('dotenv').config();

const { startAttendance } = require('./attendance');

const CLOCK_IN_HOUR =
    Number(process.env.CLOCK_IN_HOUR || 9);

const CLOCK_IN_MINUTE =
    Number(process.env.CLOCK_IN_MINUTE || 0);

function getNextRun() {
    const now = new Date();
    const next = new Date(now);

    next.setHours(
        CLOCK_IN_HOUR,
        CLOCK_IN_MINUTE,
        0,
        0
    );

    /*
     * JavaScript:
     * Sunday    = 0
     * Monday    = 1
     * Tuesday   = 2
     * Wednesday = 3
     * Thursday  = 4
     * Friday    = 5
     * Saturday  = 6
     */

    let daysToAdd = 0;

    // Sunday → Monday
    if (now.getDay() === 0) {
        daysToAdd = 1;
    }

    // Saturday after today's 9 AM → Monday
    else if (
        now.getDay() === 6 &&
        now >= next
    ) {
        daysToAdd = 2;
    }

    // Monday-Friday after 9 AM → tomorrow
    else if (
        now.getDay() >= 1 &&
        now.getDay() <= 5 &&
        now >= next
    ) {
        daysToAdd = 1;
    }

    next.setDate(next.getDate() + daysToAdd);

    // If calculated day is Sunday, move to Monday.
    if (next.getDay() === 0) {
        next.setDate(next.getDate() + 1);
    }

    return next;
}

async function scheduleNextRun() {
    const nextRun = getNextRun();

    const delay =
        nextRun.getTime() - Date.now();

    console.log('');
    console.log('=================================');
    console.log('Attendance Automator');
    console.log(
        'Current time:',
        new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        })
    );

    console.log(
        'Next run:',
        nextRun.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        })
    );

    console.log('=================================');

    setTimeout(async () => {
        try {
            await startAttendance();
        } catch (error) {
            console.error(
                'Automation error:',
                error.message
            );
        }

        scheduleNextRun();
    }, Math.max(delay, 1000));
}

scheduleNextRun();