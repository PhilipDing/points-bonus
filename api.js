const RecordType = {
    SIGN_IN: 'sign_in',
    TASK: 'task',
    REWARD: 'reward',
    MANUAL: 'manual',
    QUIZ: 'quiz'
};

function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

class LocalStorageAPI {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    async getAllData() {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    }

    async saveData(records, lastSignInDate) {
        const data = {
            records: records,
            lastSignInDate: lastSignInDate
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        return true;
    }
}

class GiteeAPI {
    constructor(token, owner, repo, path) {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.path = path;
        this.baseUrl = 'https://gitee.com/api/v5';
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `token ${this.token}`
        };
    }

    async getFileContent() {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.path}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return { content: null, sha: null };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.content) {
                return { content: null, sha: data.sha || null };
            }

            const binaryString = atob(data.content.replace(/\n/g, ''));
            const uint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }
            const decoder = new TextDecoder();
            const content = decoder.decode(uint8Array);

            return { content: JSON.parse(content), sha: data.sha };
        } catch (error) {
            console.error('Error fetching data from Gitee:', error);
            return { content: null, sha: null };
        }
    }

    async updateFileContent(data, sha) {
        try {
            const jsonString = JSON.stringify(data);
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(jsonString);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const content = btoa(binary);

            const method = sha ? 'PUT' : 'POST';
            const body = sha ? {
                content: content,
                sha: sha,
                message: `Update ${this.path}`
            } : {
                content: content,
                message: `Create ${this.path}`
            };

            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.path}`, {
                method: method,
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return { success: true, sha: result.content.sha };
        } catch (error) {
            console.error('Error updating data to Gitee:', error);
            return { success: false, sha: null };
        }
    }

    async getAllData() {
        const { content } = await this.getFileContent();
        return content;
    }

    async saveData(records, lastSignInDate) {
        const { content, sha } = await this.getFileContent();
        const data = {
            records: records,
            lastSignInDate: lastSignInDate
        };

        const result = await this.updateFileContent(data, sha);
        return result.success;
    }
}

const giteeAPIForData = new GiteeAPI(
    'ed5ad25f8f26a4915df21997fbf4c4b6',
    'philipding',
    'json-storage',
    'points-bonus.json'
);

const localStorageAPI = new LocalStorageAPI('points-bonus-data');

const giteeAPI = {
    async getAllData() {
        if (isLocalhost()) {
            return await localStorageAPI.getAllData();
        }
        return await giteeAPIForData.getAllData();
    },

    async saveData(records, lastSignInDate) {
        if (isLocalhost()) {
            return await localStorageAPI.saveData(records, lastSignInDate);
        }
        return await giteeAPIForData.saveData(records, lastSignInDate);
    }
};

const customRewardsAPI = new GiteeAPI(
    'ed5ad25f8f26a4915df21997fbf4c4b6',
    'philipding',
    'json-storage',
    'points-bonus-rewards.json'
);

const customTasksAPI = new GiteeAPI(
    'ed5ad25f8f26a4915df21997fbf4c4b6',
    'philipding',
    'json-storage',
    'points-bonus-tasks.json'
);

const customQuestionsAPI = new GiteeAPI(
    'ed5ad25f8f26a4915df21997fbf4c4b6',
    'philipding',
    'json-storage',
    'points-bonus-questions.json'
);

async function fetchLocalJson(filename) {
    try {
        const response = await fetch(filename);
        if (response.ok) {
            const data = await response.json();
            return data || [];
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching ${filename}:`, error);
        return null;
    }
}

async function fetchTasks() {
    const { content: customTasks } = await customTasksAPI.getFileContent();
    return customTasks || [];
}

async function fetchRewards() {
    const { content: customRewards } = await customRewardsAPI.getFileContent();
    return customRewards || [];
}

async function fetchQuestions() {
    if (isLocalhost()) {
        try {
            const response = await fetch('questions.json');
            if (response.ok) {
                const data = await response.json();
                return data || [];
            }
            return [];
        } catch (error) {
            console.error('Error fetching questions:', error);
            return [];
        }
    } else {
        const { content: questions } = await customQuestionsAPI.getFileContent();
        return questions || [];
    }
}
