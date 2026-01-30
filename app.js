class PointsApp {
    constructor() {
        this.records = [];
        this.lastSignInDate = '';
        this.isSigningIn = false;
        this.tasks = [];
        this.rewards = [];
        this.completingTaskId = null;
        this.redeemingRewardId = null;
        this.usingVoucherDate = null;
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
        const data = await giteeAPI.getAllData();
        if (data && data.records) {
            this.records = data.records.map(record => ({
                ...record,
                used: record.used !== undefined ? record.used : false
            }));
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
        await giteeAPI.saveData(this.records, this.lastSignInDate);
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
        } else if (pageId === 'vouchers') {
            this.renderVouchers();
        } else if (pageId === 'records') {
            this.renderRecords();
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
                    code: reward.code,
                    name: reward.name,
                    points: reward.points,
                    maxDailyTimes: reward.maxDailyTimes,
                    redeemedCount: 0
                }));

                this.rewards.forEach(reward => {
                    if (reward.maxDailyTimes) {
                        const redeemedCount = this.records.filter(record => {
                            if (record.type !== RecordType.REWARD || record.rewardCode !== reward.code) {
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
                    <span class="btn-text" style="display: ${isLoading ? 'none' : 'inline'};">${isMaxed ? '已用完' : (remainingTimes !== null ? `兑换 (${remainingTimes}/${reward.maxDailyTimes})` : '兑换')}</span>
                    <span class="btn-loading" style="display: ${isLoading ? 'inline' : 'none'};">进行中...</span>
                </button>
            `;
            rewardList.appendChild(item);
        });
    }

    renderRecords() {
        const recordList = document.getElementById('recordList');
        recordList.innerHTML = '';

        if (this.records.length === 0) {
            recordList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无积分记录</p>';
            return;
        }

        const sortedRecords = [...this.records].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'list-item';

            let actionText = '';
            let pointsClass = record.points > 0 ? 'plus' : 'minus';
            let pointsText = record.points > 0 ? `+${record.points}` : `${record.points}`;

            switch (record.type) {
                case RecordType.SIGN_IN:
                    actionText = '🎁 每日签到';
                    break;
                case RecordType.TASK:
                    actionText = `✅ ${record.taskName}`;
                    break;
                case RecordType.REWARD:
                    actionText = `🎁 ${record.rewardName}`;
                    if (record.used) {
                        actionText += ' <span style="color:#999;font-size:12px;">(已使用)</span>';
                    }
                    break;
                case RecordType.MANUAL:
                    actionText = `📝 ${record.reason || '手动调整'}`;
                    break;
            }

            const date = new Date(record.date);
            const dateText = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            let usedTimeText = '';
            if (record.used && record.usedTime) {
                const usedDate = new Date(record.usedTime);
                usedTimeText = `<div class="record-used-time" style="font-size:12px;color:#999;margin-top:4px;">使用时间: ${usedDate.getFullYear()}-${usedDate.getMonth() + 1}-${usedDate.getDate()} ${usedDate.getHours().toString().padStart(2, '0')}:${usedDate.getMinutes().toString().padStart(2, '0')}</div>`;
            }

            item.innerHTML = `
                <div class="record-date">${dateText}</div>
                <div class="record-action">${actionText}</div>
                <div class="item-points ${pointsClass}">${pointsText} 积分</div>
                ${usedTimeText}
            `;
            recordList.appendChild(item);
        });
    }

    renderVouchers() {
        const voucherList = document.getElementById('voucherList');
        voucherList.innerHTML = '';

        const vouchers = this.records.filter(record =>
            record.type === RecordType.REWARD && !record.used
        );

        if (vouchers.length === 0) {
            voucherList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无可用卡券</p>';
            return;
        }

        vouchers.forEach(record => {
            const item = document.createElement('div');
            item.className = 'voucher-item';

            const date = new Date(record.date);
            const dateText = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            item.innerHTML = `
                <div class="voucher-info">
                    <div class="voucher-name">${record.rewardName}</div>
                    <div class="voucher-date">${dateText}</div>
                </div>
                <button class="btn btn-primary btn-small"
                        id="voucherBtn-${record.date}"
                        onclick="app.useVoucher('${record.date}')"
                        ${this.usingVoucherDate === record.date ? 'disabled' : ''}>
                    <span class="btn-text" style="display: ${this.usingVoucherDate === record.date ? 'none' : 'inline'};">使用</span>
                    <span class="btn-loading" style="display: ${this.usingVoucherDate === record.date ? 'inline' : 'none'};">进行中...</span>
                </button>
            `;
            voucherList.appendChild(item);
        });
    }

    async useVoucher(recordDate) {
        if (this.usingVoucherDate) {
            return;
        }

        const record = this.records.find(r => r.date === recordDate && r.type === RecordType.REWARD);
        if (record && !record.used) {
            this.usingVoucherDate = recordDate;
            this.renderVouchers();

            record.used = true;
            record.usedTime = new Date().toISOString();
            await this.saveToStorage();

            this.usingVoucherDate = null;
            this.renderVouchers();
            this.showMessage(`<span class="emoji-large">✅</span>卡券已使用！`);
        }
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
                    <span class="btn-text" style="display: ${isLoading ? 'none' : 'inline'};">${isCompleted ? '✅ 已完成' : `完成 (${remainingTimes}/${task.maxDailyTimes})`}</span>
                    <span class="btn-loading" style="display: ${isLoading ? 'inline' : 'none'};">进行中...</span>
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
                    rewardCode: reward.code,
                    rewardName: reward.name,
                    used: false
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
        const pointsInput = document.getElementById('manualPoints');
        const reasonInput = document.getElementById('manualReason');
        const points = parseInt(pointsInput.value);
        const reason = reasonInput.value.trim();

        if (isNaN(points) || points === 0 || !Number.isInteger(points)) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入有效的整数积分数！');
            return;
        }

        if (!reason) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入原因！');
            return;
        }

        const record = {
            type: RecordType.MANUAL,
            points: points,
            date: new Date().toISOString(),
            reason: reason
        };

        this.records.push(record);
        this.saveToStorage();
        this.updatePointsDisplay();
        this.renderRecords();

        pointsInput.value = '';
        reasonInput.value = '';
        this.showMessage(`<span class="emoji-large">✅</span>成功${points > 0 ? '添加' : '扣除'} ${Math.abs(points)} 积分！`);
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

function useVoucher(recordDate) {
    app.useVoucher(recordDate);
}
