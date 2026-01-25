const JSONBIN_CONFIG = {
    X_MASTER_KEY: '$2a$10$4OUBQnybY4tuYzXwDmaeyulcikMkKYrzrLb.qeryWB8SUu/fYrEFS',
    TASK_BIN_ID: '697476a643b1c97be94617ec',
    REWARD_BIN_ID: '69747c00d0ea881f4081895f',
    INFO_BIN_ID: '697486f3ae596e708ff206ef',
    BASE_URL: 'https://api.jsonbin.io/v3/b'
};

async function fetchTasksFromJsonbin() {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.TASK_BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.X_MASTER_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.record || [];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching tasks from jsonbin:', error);
        return null;
    }
}

async function fetchRewardsFromJsonbin() {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.REWARD_BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.X_MASTER_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.record || [];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching rewards from jsonbin:', error);
        return null;
    }
}

async function fetchInfoFromJsonbin() {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.INFO_BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.X_MASTER_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.record || null;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching info from jsonbin:', error);
        return null;
    }
}

async function saveInfoToJsonbin(points, records, lastSignInDate) {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.INFO_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.X_MASTER_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                points: points,
                recrods: records,
                lastSignInDate: lastSignInDate
            })
        });

        return response.ok;
    } catch (error) {
        console.error('Error saving info to jsonbin:', error);
        return false;
    }
}

async function clearRecordsInJsonbin() {
    const today = new Date().toDateString();
    return await saveInfoToJsonbin(points, [], today);
}

window.clearRecords = clearRecordsInJsonbin;
