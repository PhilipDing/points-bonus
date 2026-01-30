class PointsApp {
    constructor() {
        this.records = [];
        this.lastSignInDate = '';
        this.isSigningIn = false;
        this.tasks = [];
        this.rewards = [];
        this.completingTaskId = null;
        this.redeemingRewardId = null;
        this.init();
    }

    async init() {
        await this.loadData();

        await Promise.all([
            this.loadTasks(),
            this.loadRewards()
        ]);
        this.updatePointsDisplay();
        this.hideLoading();
    }

    async loadData() {
        const data = await jsonBinAPI.getAllData();
        if (data && data.records) {
            this.records = data.records;
            this.lastSignInDate = data.lastSignInDate || '';
        }
    }

    calculateTotalPoints() {
        return this.records.reduce((total, record) => total + record.points, 0);
    }

    updatePointsDisplay() {
        const totalPoints = this.calculateTotalPoints();
        const totalPointsEl = document.getElementById('totalPoints');
        if (totalPointsEl) {
            totalPointsEl.textContent = totalPoints;
        }
    }

    async saveToStorage() {
        await jsonBinAPI.saveData(this.records, this.lastSignInDate);
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    showMessage(text, duration = 2000) {
        const messageEl = document.getElementById('message');
        messageEl.innerHTML = text;
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }

    setSignInButtonLoading(isLoading) {
        const btn = document.getElementById('signInBtn');
        if (btn) {
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            btn.disabled = isLoading;
            if (btnText) {
                btnText.style.display = isLoading ? 'none' : 'inline';
            }
            if (btnLoading) {
                btnLoading.style.display = isLoading ? 'inline' : 'none';
            }
        }
    }

    async signIn() {
        if (this.isSigningIn) {
            return;
        }

        this.isSigningIn = true;
        this.setSignInButtonLoading(true);

        await this.loadData();

        const today = new Date().toDateString();

        if (this.lastSignInDate === today) {
            this.showMessage('<span class="emoji-large">😊</span>今天已经签过啦！');
            this.isSigningIn = false;
            this.setSignInButtonLoading(false);
            return;
        }

        const randomPoints = [-5, 0, 5, 10][Math.floor(Math.random() * 4)];

        const record = {
            type: RecordType.SIGN_IN,
            points: randomPoints,
            date: new Date().toISOString()
        };

        this.records.push(record);
        this.lastSignInDate = today;

        await this.saveToStorage();

        this.isSigningIn = false;
        this.setSignInButtonLoading(false);
        this.updatePointsDisplay();

        if (randomPoints > 0) {
            this.showMessage(`<span class="emoji-large">🎉</span>恭喜！获得 ${randomPoints} 积分！`);
        } else if (randomPoints === 0) {
            this.showMessage('<span class="emoji-large">😊</span>签到成功！继续加油！');
        } else {
            this.showMessage(`<span class="emoji-large">💪</span>扣除 ${Math.abs(randomPoints)} 积分，继续努力！`);
        }
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        if (pageId === 'tasks') {
            this.renderTasks();
        } else if (pageId === 'rewards') {
            this.renderRewards();
        }
    }

    async loadTasks() {
        try {
            const tasksData = await fetchTasks();
            if (tasksData && tasksData.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                this.tasks = tasksData.map((task, index) => ({
                    id: index + 1,
                    code: task.code,
                    name: task.name,
                    points: task.points,
                    maxDailyTimes: task.maxDailyTimes || 1,
                    completedCount: 0
                }));

                this.tasks.forEach(task => {
                    const completedCount = this.records.filter(record => {
                        if (record.type !== RecordType.TASK || record.taskCode !== task.code) {
                            return false;
                        }
                        const recordDate = new Date(record.date);
                        recordDate.setHours(0, 0, 0, 0);
                        return recordDate.getTime() === today.getTime();
                    }).length;
                    task.completedCount = completedCount;
                });
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async loadRewards() {
        try {
            const rewardsData = await fetchRewards();
            if (rewardsData && rewardsData.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                this.rewards = rewardsData.map((reward, index) => ({
                    id: index + 1,
                    name: reward.name,
                    points: reward.points,
                    maxDailyTimes: reward.maxDailyTimes,
                    redeemedCount: 0
                }));

                this.rewards.forEach(reward => {
                    if (reward.maxDailyTimes) {
                        const redeemedCount = this.records.filter(record => {
                            if (record.type !== RecordType.REWARD || record.rewardName !== reward.name) {
                                return false;
                            }
                            const recordDate = new Date(record.date);
                            recordDate.setHours(0, 0, 0, 0);
                            return recordDate.getTime() === today.getTime();
                        }).length;
                        reward.redeemedCount = redeemedCount;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading rewards:', error);
        }
    }

    renderRewards() {
        const rewardList = document.getElementById('rewardList');
        rewardList.innerHTML = '';

        if (this.rewards.length === 0) {
            rewardList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无可用兑换</p>';
            return;
        }

        this.rewards.forEach(reward => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const isLoading = this.redeemingRewardId === reward.id;
            const isMaxed = reward.maxDailyTimes && reward.redeemedCount >= reward.maxDailyTimes;
            const remainingTimes = reward.maxDailyTimes ? reward.maxDailyTimes - reward.redeemedCount : null;
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${reward.name}</div>
                    <div class="item-points minus">${reward.points} 积分</div>
                </div>
                <button class="btn btn-secondary btn-small"
                        id="rewardBtn-${reward.id}"
                        onclick="app.redeemReward(${reward.id})"
                        ${isMaxed || isLoading ? 'disabled' : ''}>
                    <span class="btn-text">${isMaxed ? '已用完' : (remainingTimes !== null ? `兑换 (${remainingTimes}/${reward.maxDailyTimes})` : '兑换')}</span>
                    <span class="btn-loading" style="display: ${isLoading ? 'inline' : 'none'};">加载中...</span>
                </button>
            `;
            rewardList.appendChild(item);
        });
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        if (this.tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无可用任务</p>';
            return;
        }

        this.tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const isLoading = this.completingTaskId === task.id;
            const isCompleted = task.completedCount >= task.maxDailyTimes;
            const remainingTimes = task.maxDailyTimes - task.completedCount;
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${task.name}</div>
                    <div class="item-points plus">+${task.points} 积分</div>
                </div>
                <button class="btn btn-primary btn-small"
                        id="taskBtn-${task.id}"
                        onclick="app.completeTask(${task.id})"
                        ${isCompleted || isLoading ? 'disabled' : ''}>
                    <span class="btn-text">${isCompleted ? '✅ 已完成' : `完成 (${remainingTimes}/${task.maxDailyTimes})`}</span>
                    <span class="btn-loading" style="display: ${isLoading ? 'inline' : 'none'};">加载中...</span>
                </button>
            `;
            taskList.appendChild(item);
        });
    }

    async completeTask(taskId) {
        if (this.completingTaskId) {
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.completedCount < task.maxDailyTimes) {
            this.completingTaskId = taskId;
            this.renderTasks();

            const record = {
                type: RecordType.TASK,
                points: task.points,
                date: new Date().toISOString(),
                taskCode: task.code,
                taskName: task.name
            };

            this.records.push(record);
            await this.saveToStorage();

            this.completingTaskId = null;
            task.completedCount++;
            this.renderTasks();
            this.updatePointsDisplay();
            this.showMessage(`<span class="emoji-large">🎉</span>太棒了！获得 ${task.points} 积分！`);
        }
    }

    async redeemReward(rewardId) {
        if (this.redeemingRewardId) {
            return;
        }

        const reward = this.rewards.find(r => r.id === rewardId);
        if (reward) {
            if (reward.maxDailyTimes && reward.redeemedCount >= reward.maxDailyTimes) {
                this.showMessage('<span class="emoji-large">😢</span>今日兑换次数已用完！');
                return;
            }

            const totalPoints = this.calculateTotalPoints();
            if (totalPoints >= reward.points) {
                this.redeemingRewardId = rewardId;
                this.renderRewards();

                const record = {
                    type: RecordType.REWARD,
                    points: -reward.points,
                    date: new Date().toISOString(),
                    rewardName: reward.name
                };

                this.records.push(record);
                await this.saveToStorage();

                this.redeemingRewardId = null;
                if (reward.maxDailyTimes) {
                    reward.redeemedCount++;
                }
                this.renderRewards();
                this.updatePointsDisplay();
                this.showMessage(`<span class="emoji-large">🎁</span>兑换成功！获得 ${reward.name}`);
            } else {
                this.showMessage('<span class="emoji-large">😢</span>积分不够哦，继续努力！');
            }
        }
    }

    toggleManualAdd() {
        const content = document.getElementById('manualAddContent');
        const arrow = document.getElementById('manualAddArrow');
        content.classList.toggle('show');
        arrow.classList.toggle('rotate');
    }

    addManualRecord() {
    }
}

let app;

async function initApp() {
    app = new PointsApp();
    await app.init();
}

initApp();

function showPage(pageId) {
    app.showPage(pageId);
}

function signIn() {
    app.signIn();
}

function completeTask(taskId) {
    app.completeTask(taskId);
}

function redeemReward(rewardId) {
    app.redeemReward(rewardId);
}

function toggleManualAdd() {
    app.toggleManualAdd();
}

function addManualRecord() {
    app.addManualRecord();
}
