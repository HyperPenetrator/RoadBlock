const https = require('https');

const URL = 'https://hrishikeshdutta-roadfirewall-app.hf.space';
const MAX_ATTEMPTS = 60;
const DELAY = 5000;

let attempts = 0;

function ping() {
    attempts++;
    console.log(`[Attempt ${attempts}] Pinging production grid: ${URL}...`);
    
    https.get(URL, (res) => {
        const { statusCode } = res;
        console.log(`[Response] Status Code: ${statusCode}`);
        
        if (statusCode === 200) {
            console.log('MISSION SUCCESS: Production grid is LIVE and responsive (200 OK).');
            process.exit(0);
        } else {
            retry();
        }
    }).on('error', (e) => {
        console.error(`[Error] Link failed: ${e.message}`);
        retry();
    });
}

function retry() {
    if (attempts >= MAX_ATTEMPTS) {
        console.error('CRITICAL FAILURE: Production grid failed to initialize within the timeout period.');
        process.exit(1);
    }
    setTimeout(ping, DELAY);
}

ping();
