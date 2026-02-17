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
        this.addingReward = false;
        this.addingTask = false;
        this.questions = [];
        this.currentQuiz = null;
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

        let randomPoints;
        if (Math.random() < 0.8) {
            // 80% 概率获得 -5 到 5 之间的积分
            randomPoints = Math.floor(Math.random() * 11) - 5;
        } else {
            // 20% 概率获得 6 到 10 之间的积分（高分奖励）
            randomPoints = Math.floor(Math.random() * 5) + 6;
        }

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
        } else if (pageId === 'quiz') {
            this.loadQuestions();
            this.initQuizPage();
        }
    }

    initQuizPage() {
        const todayRecord = this.getTodayQuizRecord();

        if (todayRecord && todayRecord.finished) {
            document.getElementById('quizStart').style.display = 'none';
            document.getElementById('quizContent').style.display = 'none';
            document.getElementById('quizResult').style.display = 'block';
            this.showQuizResult(todayRecord.correctCount, todayRecord.betPoints, todayRecord.correctCount * todayRecord.betPoints);
        } else if (todayRecord && !todayRecord.finished) {
            document.getElementById('quizStart').style.display = 'none';
            document.getElementById('quizContent').style.display = 'block';
            document.getElementById('quizResult').style.display = 'none';
            this.showQuizContinue(todayRecord);
        } else {
            document.getElementById('quizStart').style.display = 'block';
            document.getElementById('quizContent').style.display = 'none';
            document.getElementById('quizResult').style.display = 'none';
            this.updateQuizStatus();
        }
    }

    updateQuizStatus() {
        const todayRecord = this.getTodayQuizRecord();
        const statusEl = document.getElementById('quizStatus');
        if (todayRecord && todayRecord.finished) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#FFF3E0';
            statusEl.style.color = '#E65100';
            const earnedPoints = todayRecord.correctCount * todayRecord.betPoints;
            statusEl.innerHTML = `✅ 今天已经挑战过啦！<br>用了 ${todayRecord.betPoints} 积分，答对 ${todayRecord.correctCount} 题，赚回 ${earnedPoints} 积分<br>点击下面按钮可以看题目和答案哦～`;
        } else {
            statusEl.style.display = 'none';
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
                    maxDailyTimes: task.maxDailyTimes,
                    completedCount: 0,
                    description: task.description || ''
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
                case RecordType.QUIZ:
                    if (record.points < 0) {
                        actionText = `🧠 问答挑战（参加）`;
                    } else {
                        actionText = `🧠 ${record.reason || '问答挑战奖励'}`;
                    }
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

    toggleAddReward() {
        const content = document.getElementById('addRewardContent');
        const arrow = document.getElementById('addRewardArrow');
        content.classList.toggle('show');
        arrow.classList.toggle('rotate');
    }

    async addCustomReward() {
        if (this.addingReward) {
            return;
        }

        const nameInput = document.getElementById('rewardName');
        const pointsInput = document.getElementById('rewardPoints');
        const maxDailyTimesInput = document.getElementById('rewardMaxDailyTimes');

        const name = nameInput.value.trim();
        const points = parseInt(pointsInput.value);
        const maxDailyTimes = maxDailyTimesInput.value ? parseInt(maxDailyTimesInput.value) : null;

        if (!name) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入奖品名称！');
            return;
        }

        if (isNaN(points) || points <= 0) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入有效的积分！');
            return;
        }

        this.addingReward = true;
        this.setAddRewardButtonLoading(true);

        try {
            const { content: existingRewards, sha } = await customRewardsAPI.getFileContent();
            const newReward = {
                code: `CUSTOM_${Date.now()}`,
                name: name,
                points: points,
                maxDailyTimes: maxDailyTimes
            };

            const updatedRewards = [...(existingRewards || []), newReward];
            const result = await customRewardsAPI.updateFileContent(updatedRewards, sha);

            if (result.success) {
                nameInput.value = '';
                pointsInput.value = '';
                maxDailyTimesInput.value = '';
                this.toggleAddReward();

                await this.loadRewards();
                this.renderRewards();
                this.showMessage(`<span class="emoji-large">✅</span>奖品添加成功！`);
            } else {
                this.showMessage('<span class="emoji-large">❌</span>添加失败，请重试！');
            }
        } catch (error) {
            console.error('Error adding custom reward:', error);
            this.showMessage('<span class="emoji-large">❌</span>添加失败，请重试！');
        }

        this.addingReward = false;
        this.setAddRewardButtonLoading(false);
    }

    setAddRewardButtonLoading(isLoading) {
        const btn = document.getElementById('addRewardBtn');
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

    toggleAddTask() {
        const content = document.getElementById('addTaskContent');
        const arrow = document.getElementById('addTaskArrow');
        content.classList.toggle('show');
        arrow.classList.toggle('rotate');
    }

    async addCustomTask() {
        if (this.addingTask) {
            return;
        }

        const nameInput = document.getElementById('taskName');
        const pointsInput = document.getElementById('taskPoints');
        const maxDailyTimesInput = document.getElementById('taskMaxDailyTimes');

        const name = nameInput.value.trim();
        const points = parseInt(pointsInput.value);
        const maxDailyTimes = maxDailyTimesInput.value ? parseInt(maxDailyTimesInput.value) : null;

        if (!name) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入任务名称！');
            return;
        }

        if (isNaN(points) || points <= 0) {
            this.showMessage('<span class="emoji-large">⚠️</span>请输入有效的积分！');
            return;
        }

        this.addingTask = true;
        this.setAddTaskButtonLoading(true);

        try {
            const { content: existingTasks, sha } = await customTasksAPI.getFileContent();
            const newTask = {
                code: `CUSTOM_${Date.now()}`,
                name: name,
                points: points,
                maxDailyTimes: maxDailyTimes
            };

            const updatedTasks = [...(existingTasks || []), newTask];
            const result = await customTasksAPI.updateFileContent(updatedTasks, sha);

            if (result.success) {
                nameInput.value = '';
                pointsInput.value = '';
                maxDailyTimesInput.value = '';
                this.toggleAddTask();

                await this.loadTasks();
                this.renderTasks();
                this.showMessage(`<span class="emoji-large">✅</span>任务添加成功！`);
            } else {
                this.showMessage('<span class="emoji-large">❌</span>添加失败，请重试！');
            }
        } catch (error) {
            console.error('Error adding custom task:', error);
            this.showMessage('<span class="emoji-large">❌</span>添加失败，请重试！');
        }

        this.addingTask = false;
        this.setAddTaskButtonLoading(false);
    }

    setAddTaskButtonLoading(isLoading) {
        const btn = document.getElementById('addTaskBtn');
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

    renderTasks() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        if (this.tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无可用任务</p>';
            return;
        }

        console.log('=>this.tasks', this.tasks);

        this.tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const isLoading = this.completingTaskId === task.id;
            const isCompleted = task.maxDailyTimes && task.completedCount >= task.maxDailyTimes;
            const remainingTimes = task.maxDailyTimes ? task.maxDailyTimes - task.completedCount : null;
            const pointsText = task.points > 0 ? `+${task.points}` : `${task.points}`;
            const pointsClass = task.points > 0 ? 'plus' : 'minus';
            const descriptionHtml = task.description ? `<div class="task-description">${task.description}</div>` : '';
            const buttonText = task.maxDailyTimes
                ? (isCompleted ? '✅ 已完成' : `完成 (${remainingTimes}/${task.maxDailyTimes})`)
                : '完成';
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${task.name}</div>
                    ${descriptionHtml}
                    <div class="item-points ${pointsClass}">${pointsText} 积分</div>
                </div>
                <button class="btn btn-primary btn-small"
                        id="taskBtn-${task.id}"
                        onclick="app.completeTask(${task.id})"
                        ${isCompleted || isLoading ? 'disabled' : ''}>
                    <span class="btn-text" style="display: ${isLoading ? 'none' : 'inline'};">${buttonText}</span>
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
        if (task && (!task.maxDailyTimes || task.completedCount < task.maxDailyTimes)) {
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

    async loadQuestions() {
        this.questions = await fetchQuestions();
    }

    getTodayQuizRecord() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.records.find(record => {
            if (record.type !== RecordType.QUIZ) return false;
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
        });
    }

    getAnsweredCorrectlyQuestions() {
        const answeredCorrectly = [];
        this.records.forEach(record => {
            if (record.type === RecordType.QUIZ && record.questionResults) {
                record.questionResults.forEach(result => {
                    if (result.correct) {
                        answeredCorrectly.push(result.questionCode);
                    }
                });
            }
        });
        return answeredCorrectly;
    }

    async startQuiz(betPoints) {
        const todayRecord = this.getTodayQuizRecord();

        if (todayRecord) {
            if (todayRecord.finished) {
                this.showQuizResult(todayRecord.correctCount, todayRecord.betPoints, todayRecord.correctCount * todayRecord.betPoints);
            } else {
                this.showQuizContinue(todayRecord);
            }
            return;
        }

        const totalPoints = this.calculateTotalPoints();
        if (totalPoints < betPoints) {
            this.showMessage(`<span class="emoji-large">😢</span>积分不够哦！需要 ${betPoints} 积分`);
            return;
        }

        if (this.questions.length < 2) {
            await this.loadQuestions();
        }

        const answeredCorrectly = this.getAnsweredCorrectlyQuestions();
        const availableQuestions = this.questions.filter(q => !answeredCorrectly.includes(q.code));

        if (availableQuestions.length < 2) {
            this.showMessage('<span class="emoji-large">⚠️</span>题目不足，无法开始挑战');
            return;
        }

        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, 2);

        const record = {
            type: RecordType.QUIZ,
            points: -betPoints,
            date: new Date().toISOString(),
            betPoints: betPoints,
            questions: selectedQuestions,
            questionResults: [],
            correctCount: 0,
            finished: false
        };
        this.records.push(record);
        await this.saveToStorage();
        this.updatePointsDisplay();

        this.currentQuiz = {
            betPoints: betPoints,
            questions: selectedQuestions,
            answers: [null, null],
            isReview: false,
            recordDate: record.date
        };

        document.getElementById('quizStart').style.display = 'none';
        document.getElementById('quizContent').style.display = 'block';
        document.getElementById('quizResult').style.display = 'none';
        document.getElementById('submitQuizBtn').style.display = 'block';

        this.renderQuizQuestions();
    }

    showQuizContinue(record) {
        this.currentQuiz = {
            betPoints: record.betPoints,
            questions: record.questions,
            answers: [null, null],
            isReview: false,
            recordDate: record.date
        };

        document.getElementById('quizStart').style.display = 'none';
        document.getElementById('quizContent').style.display = 'block';
        document.getElementById('quizResult').style.display = 'none';
        document.getElementById('submitQuizBtn').style.display = 'block';

        this.renderQuizQuestions();
    }

    renderQuizQuestions() {
        const quiz = this.currentQuiz;
        document.getElementById('quizBet').textContent = `用了 ${quiz.betPoints} 积分`;

        const container = document.getElementById('quizQuestions');
        container.innerHTML = '';

        quiz.questions.forEach((question, qIndex) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.marginBottom = '15px';

            const questionTitle = document.createElement('div');
            questionTitle.style.cssText = 'font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; line-height: 1.5;';
            questionTitle.textContent = `第${qIndex + 1}题：${question.question}`;
            card.appendChild(questionTitle);

            const choicesDiv = document.createElement('div');
            choicesDiv.id = `choices-${qIndex}`;

            question.choices.forEach((choice, cIndex) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-info';
                btn.style.cssText = 'margin-bottom: 10px; background: linear-gradient(135deg, #87CEEB 0%, #4FC3F7 100%);';
                btn.textContent = choice;
                btn.onclick = () => this.selectAnswer(qIndex, choice, btn);
                choicesDiv.appendChild(btn);
            });

            card.appendChild(choicesDiv);
            container.appendChild(card);
        });
    }

    selectAnswer(questionIndex, choice, selectedBtn) {
        const quiz = this.currentQuiz;
        quiz.answers[questionIndex] = choice.charAt(0);

        const choicesDiv = document.getElementById(`choices-${questionIndex}`);
        const buttons = choicesDiv.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.background = 'linear-gradient(135deg, #87CEEB 0%, #4FC3F7 100%)';
            btn.style.opacity = '0.6';
        });
        selectedBtn.style.background = 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)';
        selectedBtn.style.opacity = '1';
    }

    async submitQuiz() {
        const quiz = this.currentQuiz;

        if (quiz.answers[0] === null || quiz.answers[1] === null) {
            this.showMessage('<span class="emoji-large">⚠️</span>要把两道题都答完哦！');
            return;
        }

        document.getElementById('submitQuizBtn').style.display = 'none';

        let correctCount = 0;
        const questionResults = [];
        quiz.questions.forEach((question, qIndex) => {
            const choicesDiv = document.getElementById(`choices-${qIndex}`);
            const buttons = choicesDiv.querySelectorAll('.btn');
            const userAnswer = quiz.answers[qIndex];

            buttons.forEach(btn => {
                const btnLetter = btn.textContent.charAt(0);
                if (btnLetter === question.answer) {
                    btn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
                    btn.style.opacity = '1';
                } else if (btnLetter === userAnswer && userAnswer !== question.answer) {
                    btn.style.background = 'linear-gradient(135deg, #f44336 0%, #E57373 100%)';
                    btn.style.opacity = '1';
                }
            });

            const isCorrect = userAnswer === question.answer;
            if (isCorrect) {
                correctCount++;
            }

            questionResults.push({
                questionCode: question.code,
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.answer,
                correct: isCorrect
            });
        });

        const betPoints = quiz.betPoints;
        let earnedPoints = 0;
        if (correctCount === 1) {
            earnedPoints = betPoints;
        } else if (correctCount === 2) {
            earnedPoints = betPoints * 2;
        }

        const recordIndex = this.records.findIndex(r => r.date === quiz.recordDate);
        if (recordIndex !== -1) {
            this.records[recordIndex].correctCount = correctCount;
            this.records[recordIndex].questionResults = questionResults;
            this.records[recordIndex].finished = true;
        }

        if (earnedPoints > 0) {
            const rewardRecord = {
                type: RecordType.QUIZ,
                points: earnedPoints,
                date: new Date().toISOString(),
                reason: `问答挑战奖励（答对${correctCount}题）`
            };
            this.records.push(rewardRecord);
        }

        await this.saveToStorage();
        this.updatePointsDisplay();

        await new Promise(resolve => setTimeout(resolve, 1500));
        this.showQuizResult(correctCount, betPoints, earnedPoints);
    }

    showQuizResult(correctCount, betPoints, earnedPoints) {
        document.getElementById('quizStart').style.display = 'none';
        document.getElementById('quizContent').style.display = 'none';
        document.getElementById('quizResult').style.display = 'block';

        const resultEmoji = document.getElementById('resultEmoji');
        const resultText = document.getElementById('resultText');
        const resultScore = document.getElementById('resultScore');
        const resultActionBtn = document.getElementById('resultActionBtn');

        if (correctCount === 2) {
            resultEmoji.textContent = '🎉';
            resultText.textContent = '太厉害了！全对！';
            resultScore.innerHTML = `用了 ${betPoints} 积分，赚回 ${earnedPoints} 积分<br>净赚 <span style="color: #4CAF50; font-weight: bold;">+${earnedPoints - betPoints}</span> 积分！`;
        } else if (correctCount === 1) {
            resultEmoji.textContent = '😊';
            resultText.textContent = '不错哦！答对一半！';
            resultScore.innerHTML = `用了 ${betPoints} 积分，赚回 ${earnedPoints} 积分<br>积分不多不少～`;
        } else {
            resultEmoji.textContent = '😢';
            resultText.textContent = '没关系，下次加油！';
            resultScore.innerHTML = `用了 ${betPoints} 积分<br>可惜没答对，积分没了～`;
        }

        resultActionBtn.textContent = '📋 看看正确答案';
        resultActionBtn.onclick = () => this.showQuizReview(this.getTodayQuizRecord());
    }

    showQuizReview(record) {
        this.currentQuiz = {
            betPoints: record.betPoints,
            questions: record.questions,
            correctCount: record.correctCount,
            isReview: true
        };

        document.getElementById('quizStart').style.display = 'none';
        document.getElementById('quizContent').style.display = 'block';
        document.getElementById('quizResult').style.display = 'none';
        document.getElementById('submitQuizBtn').style.display = 'none';

        this.renderQuizQuestionsReview();
    }

    renderQuizQuestionsReview() {
        const quiz = this.currentQuiz;
        document.getElementById('quizBet').textContent = `用了 ${quiz.betPoints} 积分（回顾模式）`;

        const container = document.getElementById('quizQuestions');
        container.innerHTML = '';

        quiz.questions.forEach((question, qIndex) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.marginBottom = '15px';

            const questionTitle = document.createElement('div');
            questionTitle.style.cssText = 'font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; line-height: 1.5;';
            questionTitle.textContent = `第${qIndex + 1}题：${question.question}`;
            card.appendChild(questionTitle);

            const choicesDiv = document.createElement('div');

            question.choices.forEach((choice, cIndex) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-info';
                btn.style.marginBottom = '10px';
                const btnLetter = choice.charAt(0);
                if (btnLetter === question.answer) {
                    btn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
                } else {
                    btn.style.background = 'linear-gradient(135deg, #f44336 0%, #E57373 100%)';
                }
                btn.textContent = choice;
                btn.disabled = true;
                choicesDiv.appendChild(btn);
            });

            card.appendChild(choicesDiv);
            container.appendChild(card);
        });

        const resultDiv = document.createElement('div');
        resultDiv.className = 'card';
        resultDiv.style.textAlign = 'center';
        resultDiv.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">📋 今天的挑战结果</div>
            <div>答对 ${quiz.correctCount} 题，赚回 ${quiz.correctCount * quiz.betPoints} 积分</div>
        `;
        container.appendChild(resultDiv);

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-primary';
        backBtn.style.marginTop = '15px';
        backBtn.textContent = '⬅️ 返回结果';
        backBtn.onclick = () => this.resetQuiz();
        container.appendChild(backBtn);
    }

    resetQuiz() {
        this.currentQuiz = null;
        const todayRecord = this.getTodayQuizRecord();
        if (todayRecord && todayRecord.finished) {
            this.showQuizResult(todayRecord.correctCount, todayRecord.betPoints, todayRecord.correctCount * todayRecord.betPoints);
        } else {
            document.getElementById('quizStart').style.display = 'block';
            document.getElementById('quizContent').style.display = 'none';
            document.getElementById('quizResult').style.display = 'none';
            this.updateQuizStatus();
        }
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

function toggleAddReward() {
    app.toggleAddReward();
}

function addCustomReward() {
    app.addCustomReward();
}

function toggleAddTask() {
    app.toggleAddTask();
}

function addCustomTask() {
    app.addCustomTask();
}

function startQuiz(betPoints) {
    app.startQuiz(betPoints);
}

function submitQuiz() {
    app.submitQuiz();
}

function resetQuiz() {
    app.resetQuiz();
}
