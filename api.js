const RecordType = {
    SIGN_IN: 'sign_in',
    TASK: 'task',
    REWARD: 'reward',
    MANUAL: 'manual'
};

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

const giteeAPI = new GiteeAPI(
    'ed5ad25f8f26a4915df21997fbf4c4b6',
    'philipding',
    'json-storage',
    'points-bonus.json'
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
    return await fetchLocalJson('tasks.json');
}

async function fetchRewards() {
    return await fetchLocalJson('rewards.json');
}
