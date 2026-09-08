// ======================================================
// ATTENDANCE AUTOMATOR - TEST RUNNER
// ======================================================

process.env.TEST_MODE = 'true';

console.log('');
console.log('========================================');
console.log('   ATTENDANCE AUTOMATOR - TEST MODE');
console.log('========================================');
console.log('Time-window restriction: BYPASSED');
console.log('Using normal .env credentials');
console.log('Using normal saved session');
console.log('Starting attendance automation...');
console.log('========================================');
console.log('');

const {
    startAttendance
} = require('./attendance');

startAttendance()
    .catch(error => {

        console.error('');
        console.error(
            '❌ Test automation failed:'
        );

        console.error(
            error.message
        );

        process.exitCode = 1;
    });