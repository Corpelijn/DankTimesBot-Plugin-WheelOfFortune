import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { Util } from "./util";
import { Equalizer } from "./actions/equalizer";
import { Jackpot, LowJackpot } from "./actions/jackpot";
import { Plugin } from "./plugin";
import { BotCommandConfirmationQuestion } from "../../src/bot-commands/bot-command-confirmation-question";
import { PreUserScoreChangedEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/pre-user-score-changed-event-arguments";
import { WheelAction } from "./wheel-action";
import { CappedGains } from "./actions/capped-gains";
import { ExtraCosts } from "./actions/extra-costs";
import { Life } from "./actions/plugins/life";
import { SpongeMock } from "./actions/plugins/spongemock";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PayForMessages } from "./actions/pay-for-messages";
import { DanktimeMultiplier } from "./actions/danktime-multiplier";
import { Nothing } from "./actions/nothing";
import { ChatStatistics } from "./statistics";
import { Mute } from "./actions/mute";
import { TagAtRandom } from "./actions/tag-at-random";
import { DankTime } from "../../src/dank-time/dank-time";
import { PreDankTimeEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/pre-dank-time-event-arguments";

export class ChatManager {

    private wheel: WheelAction[];
    private allActions: WheelAction[];
    private userClaimedActions: WheelAction[];
    private isSpinning = false;

    private scoreChangeMethods = new Array<[WheelAction, (args: PreUserScoreChangedEventArguments) => void]>();
    private interceptMessageMethods = new Array<[WheelAction, (args: ChatMessageEventArguments) => void]>();
    private dankTimeMethods = new Array<[WheelAction, (args: PreDankTimeEventArguments) => void]>();

    constructor(public chat: Chat, private plugin: Plugin, private statistics: ChatStatistics) {
        this.userClaimedActions = [];
    }

    /**
     * Rewards the specified player with the specified amount of points.
     * @param amount The amount of points to reward.
     * @param user The user to reward the points to.
     */
    public rewardPoints(amount: number, user: User) {
        this.chat.alterUserScore(new AlterUserScoreArgs(user, amount, Plugin.NAME, `${Plugin.NAME}.price`));
        this.statistics.alterBalance(-amount);
    }

    /**
     * Reduces the points of the specified player with the specified amount of points.
     * @param amount The amount of points to recude.
     * @param user The user to take the points from.
     */
    public reducePoints(amount: number, user: User) {
        this.chat.alterUserScore(new AlterUserScoreArgs(user, -amount, Plugin.NAME, `${Plugin.NAME}.costs`));
        this.statistics.alterBalance(amount);
    }

    /**
     * Subscribes to the score change events of the winning user of the specified wheel action.
     * @param wheelAction The action that is subscribing.
     * @param action The method that is called when a score change is triggered.
     */
    public subscribeScoreChange(wheelAction: WheelAction, action: (args: PreUserScoreChangedEventArguments) => void) {
        this.scoreChangeMethods.push([wheelAction, action]);
    }

    /**
     * Subscribes to message post events of the winning user of the specified wheel action.
     * @param wheelAction The action that is subscribing.
     * @param action The method that is called when the user sends a message.
     */
    public subscribeMessagePost(wheelAction: WheelAction, action: (args: ChatMessageEventArguments) => void) {
        this.interceptMessageMethods.push([wheelAction, action]);
    }

    /**
     * Subscribes a user to the next random dank time.
     * @param user The user to subscribe.
     */
    public subscribeToDankTime(wheelAction: WheelAction, action: (args: PreDankTimeEventArguments) => void) {
        this.dankTimeMethods.push([wheelAction, action]);
    }

    /**
     * Spin the wheel of fortune.
     * @param user The user that spins the wheel.
     * @returns The result of the wheel spin or a question to confirm to spin the wheel if the player has already spun the wheel today.
     */
    public spin(user: User): string | BotCommandConfirmationQuestion {
        this.clearOldWheelActions();

        if (this.isSpinning) {
            return `The Wheel of Fortune cannot be spun while it is spinning, wait until it is done.`;
        }

        const intervalMinutes = Number(this.chat.getSetting(Plugin.SETTING_INTERVAL_BETWEEN_SPINS));

        const userClaimedActions = this.userClaimedActions.filter(ca => ca.winner?.id === user.id).sort((a, b) => b.winTime?.getTime()! - a.winTime?.getTime()!) ?? [];
        const lastSpin = userClaimedActions.length > 0 ? userClaimedActions[0].winTime : new Date(0);
        const nextSpin = new Date(lastSpin!.getTime() + (intervalMinutes * 60 * 1000));

        if (nextSpin > new Date()) {
            const leftoverTime = Math.ceil(Math.abs(new Date().getTime() - nextSpin.getTime()) / 1000 / 60);
            const leftoverTimeString = leftoverTime <= 1 ? "in one minute" : `over ${leftoverTime} minutes`;
            return `The Wheel of Fortune is unavailable right now. Try again ${leftoverTimeString}.`;
        }

        const estimatedWinnings = Math.max(Math.round(this.calculateEstimatedWinnings(user) * 2), 50);
        if (this.userClaimedActions.map(u => u.winner).includes(user)) {
            if (user.score < estimatedWinnings) {
                return `You do not have the points for that you peasant.`;
            }
            return {
                confirmationQuestionText: `You have already spun the wheel today.\nAn additional spin would cost you ${estimatedWinnings} points.\nAre you sure? Type 'yes' to confirm.`,
                actionOnConfirm: () => {
                    if (this.isSpinning) {
                        return `The Wheel of Fortune cannot be spun while it is spinning, wait until it is done.`;
                    }

                    this.chat.alterUserScore(new AlterUserScoreArgs(user, -estimatedWinnings, Plugin.NAME, `${Plugin.NAME}.additionalspin`));
                    this.statistics.alterBalance(estimatedWinnings);
                    return this.executeSpin(user);
                },
            };
        }

        return this.executeSpin(user);
    }

    /**
     * Generates a new wheel for the current chat.
     */
    public clearAndGenerateWheel() {
        const users = Array.from(this.chat.users.values()).filter(u => u.id !== undefined && u.score > 0);
        const userScoreAverage = users.map(user => user.score).reduce<number>((score, total) => total + score, 0) / users.length;
        const userScoreMedian = users.map(user => user.score)[Math.floor(users.length / 2)];
        this.allActions = [];

        this.allActions.push(...CappedGains.getCappedGains());
        this.allActions.push(...DanktimeMultiplier.getDankTimeMultiplier(this.chat));
        this.allActions.push(...Equalizer.getEqualizers(users));
        this.allActions.push(...ExtraCosts.getExtraCosts());
        this.allActions.push(...Jackpot.getJackpots(userScoreMedian));
        this.allActions.push(...LowJackpot.getJackpots());
        this.allActions.push(...Mute.getMutes());
        this.allActions.push(...Nothing.getNothing());
        this.allActions.push(...PayForMessages.getPayForMessages());
        this.allActions.push(...TagAtRandom.getTagRandomDankTime(this));

        // Add conditional actions
        this.allActions.push(...Life.getLife(this.chat));
        this.allActions.push(...SpongeMock.getSpongeMock(this.chat));

        Util.shuffle(this.allActions);

        this.wheel = [];
        this.updateWheel(this.wheel);
    }

    /**
     * Gets the explanation of all the items that are currently on the wheel.
     * @returns The explanation of all item.
     */
    public explainWheel(): string {
        return `The wheel of fortune has the following items today:\n\n${this.wheel.map(e => `${e.lightIcon} ${e.title}\n${e.description}`).join('\n\n')}`;
    }

    /**
     * Handles score change events from the Plugin and triggers the correct subscribers.
     * @param args The score change event args.
     */
    public handleScoreChange(args: PreUserScoreChangedEventArguments) {
        const methods = this.scoreChangeMethods
            .filter(sc => sc[0].winner?.id === args.user.id)
            .map(sc => sc[1]);

        for (const method of methods) {
            method(args);
        }
    }

    /**
     * Handles message send events from the Plugin and triggers the correct subscribers.
     * @param args The message event args.
     */
    public handleChatMessage(args: ChatMessageEventArguments) {
        const methods = this.interceptMessageMethods
            .filter(sc => sc[0].winner?.id === args.user.id)
            .map(sc => sc[1]);

        for (const method of methods) {
            method(args);
        }
    }

    /**
     * Handles a danktime when it arrives.
     * On a random danktime users are tagged if they have won the correct item.
     * @param dankTime The danktime that has arrived.
     */
    public handleDankTime(args: PreDankTimeEventArguments) {
        for (const method of this.dankTimeMethods.map(x => x[1])) {
            method(args);
        }
    }

    /**
     * Clears expired actions from the claimed list
     */
    public clearOldWheelActions(): void {
        this.userClaimedActions = this.userClaimedActions.filter(x => !x.isExpired);
        this.scoreChangeMethods = this.scoreChangeMethods.filter(x => !x[0].isExpired);
        this.interceptMessageMethods = this.interceptMessageMethods.filter(x => !x[0].isExpired);
    }

    public sendMessage(message: string, timeout: number = 500): void {
        setTimeout(() => this.plugin.sendTextMessage(this.chat.id, message), timeout);
    }

    public removeMessage(messageId: number) {
        this.plugin.removeMessage(this.chat.id, messageId);
    }

    public getStatistics(): ChatStatistics {
        return this.statistics;
    }

    public printUserClaimedActions(user: User | null): string {
        this.clearOldWheelActions();

        const claimedUsers = Array.from(new Set(this.userClaimedActions.map(u => u.winner as User)));
        const users = !user ? claimedUsers : [user];

        let message = '';
        for(const usr of users) {
            message += this.getUserClaimedActions(usr) + '\n';
        }
        // const actions = user === null ? this.userClaimedActions : this.userClaimedActions.filter(a => a.winner?.id === user.id);
        // let message = `Winnings and punishments for ${user === null ? 'everyone' : user.name}:\n\n`;
        // for (const action of actions) {
        //     message += `- <b>${action.name}</b> -- <i>${action.getLeftoverTime()} left</i>\n`;
        //     message += `${action.description}\n\n`;
        // }

        // if (actions.length === 0) {
        //     message += 'None';
        // }

        return message;
    }

    private getUserClaimedActions(user: User) {
        const actions = this.userClaimedActions.filter(ua => ua.winner?.id === user.id);
        let message = `Winnings and punishments for ${user.name}:\n\n`;
        for (const action of actions) {
            message += `- <b>${action.name}</b> -- <i>${action.getLeftoverTime()} left</i>\n`;
            message += `${action.description}\n\n`;
        }

        if (actions.length === 0) {
            message += 'None';
        }

        return message;
    }

    private executeSpin(user: User): string {

        this.isSpinning = true;
        this.sendMessage('The wheel is slowing down...', 5000);
        this.sendMessage('The wheel is coming to a stop...', 9000);
        setTimeout(() => {

            const index = Math.floor(Math.random() * (this.wheel.length));
            const action = this.wheel[index];

            action.awardWinnings(this, user);
            if (action.needsReplacing(user)) {
                this.wheel.splice(index, 1);
                this.updateWheel(this.wheel);
            }

            this.userClaimedActions.push(action);

            this.statistics.spinMade();

            const winDescription = this.getSpinDescription(action, user);
            this.sendMessage(winDescription);
            this.isSpinning = false;
        }, 11000);

        this.plugin.sendVideoMessage(this.chat.id);
        return 'You give the wheel a mighty spin';
    }

    private updateWheel(wheel: WheelAction[]): void {
        const targetLength = Number(this.chat.getSetting(Plugin.SETTING_ITEMS_ON_WHEEL));
        const targetFitness = -1;
        let fitnessDelta = 0.5;

        let iterations = 0;
        let currentWheelFitness = this.calculateWheelFitness(wheel);
        while ((wheel.length < targetLength || !Util.inRange(currentWheelFitness, targetFitness, fitnessDelta)) && iterations < targetLength * 100) {
            wheel.push(this.getNewWheelAction(currentWheelFitness));

            if (wheel.length > targetLength) {
                wheel.splice(0, 1);
            }

            if (Math.max(0, iterations - 10) / 5 > 1) {
                fitnessDelta = 0.5 + ((Math.max(0, iterations - 10) / 5) * 0.5);
            }

            currentWheelFitness = this.calculateWheelFitness(wheel);
            iterations++;
        }

        Util.shuffle(wheel);
    }

    private getSpinDescription(action: WheelAction, user: User): string {
        let message = action.lightIcon.repeat(10);
        message += `\n\n${action.name.toUpperCase()}\n\n${action.description}\n\n`;
        message += action.lightIcon.repeat(10);
        return message;
    }

    private calculateEstimatedWinnings(user: User): number {
        let total = 0;
        for (const action of this.wheel) {
            total += action.getEstimatedPrice(user);
        }

        return total / this.wheel.length;
    }

    private calculateWheelFitness(actions: WheelAction[]): number {
        return actions.map(a => a.priceQuality).reduce((v, total) => total + v, 0);
    }

    private getNewWheelAction(currentWheelFitness: number): WheelAction {
        const balance = Math.max(0, this.statistics.getBalance());
        let filteredActions = this.allActions.filter(a => !this.wheel.some(wa => wa.category === a.category)).filter(a => a.pointRequirement <= balance);

        if (currentWheelFitness < -5) {
            filteredActions = filteredActions.filter(a => a.priceQuality >= 0);
        }

        return filteredActions[Math.floor(Math.random() * filteredActions.length)];
    }
}