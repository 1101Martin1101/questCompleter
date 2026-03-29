/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

export default definePlugin({
    name: "Quest Completer",
    description: "Add a button to automatically complete Discord quests. Click the 'Complete Quests' button in the Quests section, select which quests you want to complete, and they will be progressively completed automatically.",
    authors: [{ name: "Kulih", id: 771295264153141250n }],

    start() {
        this.injectButton();
        this.setupMutationObserver();
    },

    stop() {
        document.querySelectorAll(".quest-completer-button").forEach(btn => btn.remove());
        document.querySelectorAll(".quest-selector-modal").forEach(modal => modal.remove());
    },

    setupMutationObserver() {
        const observer = new MutationObserver(() => {
            if (!document.querySelector(".quest-completer-button")) {
                this.injectButton();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    getAvailableQuests() {
        delete (window as any).$;
        
        const wpRequire = (window as any).webpackChunkdiscord_app.push([[Symbol()], {}, (r: any) => r]);
        (window as any).webpackChunkdiscord_app.pop();

        const QuestsStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.A?.__proto__?.getQuest)?.exports.A;
        const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
        
        if (!QuestsStore) return [];

        return [...QuestsStore.quests.values()].filter((x: any) => 
            x.userStatus?.enrolledAt && 
            !x.userStatus?.completedAt && 
            new Date(x.config.expiresAt).getTime() > Date.now() && 
            supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
        ).map((x: any) => ({
            id: x.id,
            name: x.config.messages.questName,
            app: x.config.application.name,
            taskType: supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
        }));
    },

    showNotification(message: string, type: "info" | "error" | "success" | "warn" = "info") {
        const notification = document.createElement("div");
        let bgColor, borderColor;
        if (type === "error") {
            bgColor = "rgba(255, 0, 0, 0.2)";
            borderColor = "#FF0000";
        } else if (type === "success") {
            bgColor = "rgba(0, 255, 0, 0.2)";
            borderColor = "#00FF00";
        } else if (type === "warn") {
            bgColor = "rgba(255, 255, 0, 0.2)";
            borderColor = "#FFFF00";
        } else {
            bgColor = "rgba(0, 209, 255, 0.2)";
            borderColor = "#00D1FF";
        }
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColor};
            color: ${borderColor};
            padding: 14px 32px;
            border: 2.5px solid ${borderColor};
            border-radius: 32px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 10001;
            font-weight: 600;
            font-size: 15px;
            max-width: 400px;
            animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            backdrop-filter: blur(16px);
        `;
        
        const style = document.createElement("style");
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
        `;
        
        if (!document.querySelector("style[data-notification-styles]")) {
            style.setAttribute("data-notification-styles", "true");
            document.head.appendChild(style);
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = "fadeOut 0.5s ease-out forwards";
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 2000);
    },

    showQuestSelector() {
        const availableQuests = this.getAvailableQuests();
        
        if (availableQuests.length === 0) {
            this.showNotification("No available quests to complete!", "error");
            return;
        }

        const selectedQuests = [];
        const modal = document.createElement("div");
        modal.className = "quest-selector-modal";
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const container = document.createElement("div");
        container.style.cssText = `
            background: #36393f;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            max-height: 600px;
            overflow-y: auto;
            color: white;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        `;

        const title = document.createElement("h2");
        title.textContent = "Select Quests to Complete";
        title.style.cssText = "margin: 0 0 20px 0; font-size: 20px;";
        container.appendChild(title);

        availableQuests.forEach(quest => {
            const label = document.createElement("label");
            label.style.cssText = `
                display: flex;
                align-items: center;
                padding: 10px;
                margin: 8px 0;
                background: #2f3136;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedQuests.includes(quest.id);
            checkbox.style.cssText = "margin-right: 12px; cursor: pointer; width: 18px; height: 18px;";

            const info = document.createElement("div");
            info.style.cssText = "flex: 1;";
            info.innerHTML = `
                <div style="font-weight: 600;">${quest.name}</div>
                <div style="font-size: 12px; color: #a3a6aa;">${quest.app} - ${quest.taskType}</div>
            `;

            label.appendChild(checkbox);
            label.appendChild(info);

            label.addEventListener("mouseover", () => {
                label.style.backgroundColor = "#383c41";
            });

            label.addEventListener("mouseout", () => {
                label.style.backgroundColor = "#2f3136";
            });

            checkbox.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    if (!selectedQuests.includes(quest.id)) {
                        selectedQuests.push(quest.id);
                    }
                } else {
                    const index = selectedQuests.indexOf(quest.id);
                    if (index > -1) {
                        selectedQuests.splice(index, 1);
                    }
                }

            });

            container.appendChild(label);
        });

        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = "display: flex; gap: 12px; margin-top: 20px;";

        const startButton = document.createElement("button");
        startButton.textContent = "Start Completing Quests";
        startButton.style.cssText = `
            flex: 1;
            padding: 10px 16px;
            background-color: #5865F2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.2s;
        `;

        startButton.addEventListener("mouseover", () => {
            startButton.style.backgroundColor = "#4752C4";
        });

        startButton.addEventListener("mouseout", () => {
            startButton.style.backgroundColor = "#5865F2";
        });

        startButton.addEventListener("click", () => {
            if (selectedQuests.length === 0) {
                this.showNotification("Please select at least one quest!", "error");
                return;
            }
            console.log("%c DONE", "font-size: 50px; font-weight: bold; color: #5865F2;");
            this.showNotification("Starting quests completion...", "success");
            modal.remove();
            this.runQuestScript(selectedQuests);
        });

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.cssText = `
            padding: 10px 16px;
            background-color: #40444b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.2s;
        `;

        cancelButton.addEventListener("mouseover", () => {
            cancelButton.style.backgroundColor = "#484c54";
        });

        cancelButton.addEventListener("mouseout", () => {
            cancelButton.style.backgroundColor = "#40444b";
        });

        cancelButton.addEventListener("click", () => {
            modal.remove();
        });

        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(cancelButton);
        container.appendChild(buttonContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
    },

    injectButton() {
        const headerBar = document.querySelector(".headerBar__1a9ce");
        if (!headerBar || document.querySelector(".quest-completer-button")) return;

        const button = document.createElement("button");
        button.className = "quest-completer-button";
        button.style.cssText = `
            padding: 6px 12px;
            margin-left: 12px;
            background-color: #5865F2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        
        button.textContent = "Complete Quests";

        button.addEventListener("mouseover", () => {
            button.style.backgroundColor = "#4752C4";
        });

        button.addEventListener("mouseout", () => {
            button.style.backgroundColor = "#5865F2";
        });

        button.addEventListener("click", () => {
            const availableQuests = this.getAvailableQuests();
            if (availableQuests.length === 0) {
                this.showNotification("No available quests to complete!", "error");
                return;
            }
            const questIds = availableQuests.map((q: any) => q.id);
            this.showNotification("Starting quests completion...", "success");
            this.runQuestScript(questIds);
        });

        const toolbar = headerBar.querySelector(".toolbar__9293f");
        if (toolbar) {
            toolbar.appendChild(button);
        }
    },

    runQuestScript(selectedQuestIds: string[]) {
        delete (window as any).$;
        
        const wpRequire = (window as any).webpackChunkdiscord_app.push([[Symbol()], {}, (r: any) => r]);
        (window as any).webpackChunkdiscord_app.pop();

        const ApplicationStreamingStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports.A;
        const RunningGameStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.Ay?.getRunningGames)?.exports.Ay;
        const QuestsStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.A?.__proto__?.getQuest)?.exports.A;
        const ChannelStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports.A;
        const GuildChannelStore = Object.values(wpRequire.c).find((x: any) => x?.exports?.Ay?.getSFWDefaultChannel)?.exports.Ay;
        const FluxDispatcher = Object.values(wpRequire.c).find((x: any) => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports.h;
        const api = Object.values(wpRequire.c).find((x: any) => x?.exports?.Bo?.get)?.exports.Bo;

        const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
        const allQuests = [...QuestsStore.quests.values()].filter((x: any) => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now() && supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y)));
        
        // Filter to only selected quests
        const quests = allQuests.filter((x: any) => selectedQuestIds.includes(x.id));
        
        // Track quests for completion detection
        const trackedQuests = new Map<string, {name: string, completed: boolean}>();
        const self = this;
        
        quests.forEach(q => {
            trackedQuests.set(q.id, {
                name: q.config.messages.questName,
                completed: false
            });
        });
        
        // Check for quest completions
        const checkQuestCompletion = () => {
            const allCurrentQuests = [...QuestsStore.quests.values()];
            
            for (const [questId, questData] of trackedQuests) {
                if (!questData.completed) {
                    const quest = allCurrentQuests.find(q => q.id === questId);
                    if (quest?.userStatus?.completedAt) {
                        questData.completed = true;
                        self.showNotification(`Quest "${questData.name}" completed!`, "info");
                    }
                }
            }
        };
        
        const checkInterval = setInterval(checkQuestCompletion, 3000);
        
        const isApp = typeof DiscordNative !== "undefined";
        
        if (quests.length === 0) {
            console.log("No selected quests to complete!");
        } else {
            const doJob = () => {
                const quest = quests.pop();
                if (!quest) {
                    console.log("All selected quests completed!");
                    clearInterval(checkInterval);
                    return;
                }

                const pid = Math.floor(Math.random() * 30000) + 1000;
                const applicationId = quest.config.application.id;
                const applicationName = quest.config.application.name;
                const questName = quest.config.messages.questName;
                const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
                const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
                const secondsNeeded = taskConfig.tasks[taskName].target;
                let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

                if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
                    const maxFuture = 10, speed = 7, interval = 1;
                    const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
                    let completed = false;
                    
                    const fn = async () => {
                        while (true) {
                            const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                            const diff = maxAllowed - secondsDone;
                            const timestamp = secondsDone + speed;
                            
                            if (diff >= speed) {
                                const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                                completed = res.body.completed_at != null;
                                secondsDone = Math.min(secondsNeeded, timestamp);
                            }

                            if (timestamp >= secondsNeeded) {
                                break;
                            }
                            await new Promise(resolve => setTimeout(resolve, interval * 1000));
                        }
                        
                        if (!completed) {
                            await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                        }
                        console.log(`Quest "${questName}" completed!`);
                        doJob();
                    };
                    fn();
                    console.log(`Simulating video progress for "${questName}".`);
                } else if (taskName === "PLAY_ON_DESKTOP") {
                    if (!isApp) {
                        console.log(`Quest "${questName}" requires Discord desktop app to complete!`);
                        doJob();
                    } else {
                        api.get({ url: `/applications/public?application_ids=${applicationId}` }).then((res: any) => {
                            const appData = res.body[0];
                            const exeName = appData.executables?.find((x: any) => x.os === "win32")?.name?.replace(">", "") ?? appData.name.replace(/[\/\\:*?"<>|]/g, "");

                            const fakeGame = {
                                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                                exeName,
                                exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                                hidden: false,
                                isLauncher: false,
                                id: applicationId,
                                name: appData.name,
                                pid: pid,
                                pidPath: [pid],
                                processName: appData.name,
                                start: Date.now(),
                            };

                            const realGames = RunningGameStore.getRunningGames();
                            const fakeGames = [fakeGame];
                            const realGetRunningGames = RunningGameStore.getRunningGames;
                            const realGetGameForPID = RunningGameStore.getGameForPID;
                            
                            RunningGameStore.getRunningGames = () => fakeGames;
                            RunningGameStore.getGameForPID = (pid: number) => fakeGames.find(x => x.pid === pid);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

                            const fn = (data: any) => {
                                const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                                console.log(`Quest progress: ${progress}/${secondsNeeded}`);

                                if (progress >= secondsNeeded) {
                                    console.log(`Quest "${questName}" completed!`);
                                    RunningGameStore.getRunningGames = realGetRunningGames;
                                    RunningGameStore.getGameForPID = realGetGameForPID;
                                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                    doJob();
                                }
                            };
                            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                            console.log(`Simulating gameplay for "${applicationName}". Waiting ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                        });
                    }
                } else if (taskName === "STREAM_ON_DESKTOP") {
                    if (!isApp) {
                        console.log(`Quest "${questName}" requires Discord desktop app to complete!`);
                        doJob();
                    } else {
                        const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                            id: applicationId,
                            pid,
                            sourceName: null
                        });

                        const fn = (data: any) => {
                            const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                            console.log(`Quest progress: ${progress}/${secondsNeeded}`);

                            if (progress >= secondsNeeded) {
                                console.log(`Quest "${questName}" completed!`);
                                ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                doJob();
                            }
                        };
                        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        console.log(`Simulating stream from "${applicationName}". Wait ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                    }
                } else if (taskName === "PLAY_ACTIVITY") {
                    const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find((x: any) => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
                    const streamKey = `call:${channelId}:1`;

                    const fn = async () => {
                        console.log(`Completing quest "${questName}"`);

                        while (true) {
                            const res = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                            const progress = res.body.progress.PLAY_ACTIVITY.value;
                            console.log(`Quest progress: ${progress}/${secondsNeeded}`);

                            await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                            if (progress >= secondsNeeded) {
                                await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                                break;
                            }
                        }

                        console.log(`Quest "${questName}" completed!`);
                        doJob();
                    };
                    fn();
                }
            };
            doJob();
        }
    }
});

