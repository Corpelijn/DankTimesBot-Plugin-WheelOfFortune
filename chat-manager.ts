import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { Util } from "./util";
import { Equalizer } from "./actions/equalizer";
import { Jackpot } from "./actions/jackpot";
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
import { ChatStatistics, Statistics } from "./statistics";
import { Mute } from "./actions/mute";

export class ChatManager {

    private wheel: WheelAction[];
    private allActions: WheelAction[];
    private userClaimedActions: WheelAction[];
    private lastSpin: Date;

    private scoreChangeMethods = new Map<number, ((args: PreUserScoreChangedEventArguments) => void)[]>();
    private interceptMessageMethods = new Map<number, ((args: ChatMessageEventArguments) => void)[]>();

    constructor(public chat: Chat, private plugin: Plugin, private statistics: ChatStatistics) {
        this.userClaimedActions = [];
        this.lastSpin = new Date(0);
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
     * Subscribes to the score change events of the specified user.
     * @param user The user to subscribe to.
     * @param action The method that is called when a score change is triggered.
     */
    public subscribeScoreChange(user: User, action: (args: PreUserScoreChangedEventArguments) => void) {
        let methods: ((args: PreUserScoreChangedEventArguments) => void)[] = [];
        if (this.scoreChangeMethods.has(user.id)) {
            methods = this.scoreChangeMethods.get(user.id)!;
        }

        methods.push(action);

        this.scoreChangeMethods.set(user.id, methods);
    }

    /**
     * Subscribes to message post events of the specified user.
     * @param user The user to subscribe to.
     * @param action The method that is called when the user sends a message.
     */
    public subscribeMessagePost(user: User, action: (args: ChatMessageEventArguments) => void) {
        let methods: ((args: ChatMessageEventArguments) => void)[] = [];
        if (this.interceptMessageMethods.has(user.id)) {
            methods = this.interceptMessageMethods.get(user.id)!;
        }

        methods.push(action);

        this.interceptMessageMethods.set(user.id, methods);
    }

    /**
     * Spin the wheel of fortune.
     * @param user The user that spins the wheel.
     * @returns The result of the wheel spin or a question to confirm to spin the wheel if the player has already spun the wheel today.
     */
    public spin(user: User): string | BotCommandConfirmationQuestion {
        this.clearOldWheelActions();

        const intervalMinutes = Number(this.chat.getSetting(Plugin.SETTING_INTERVAL_BETWEEN_SPINS));
        const nextSpin = new Date(this.lastSpin.getTime() + (intervalMinutes * 60 * 1000));
        if (nextSpin > new Date()) {
            const leftoverTime = Math.ceil(Math.abs(new Date().getTime() - nextSpin.getTime()) / 1000 / 60);
            const leftoverTimeString = leftoverTime <= 1 ? "in one minute" : `over ${leftoverTime} minutes`;
            return `The Wheel of Fortune is unavailable right now. Try again ${leftoverTimeString}.`;
        }

        const estimatedWinnings = Math.max(Math.round(this.calculateEstimatedWinnings(user) * 2), 50);
        if (this.userClaimedActions.map(u => u.winner).includes(user)) {
            return {
                confirmationQuestionText: `You have already spun the wheel today.\nAn additional spin would cost you ${estimatedWinnings} points.\nAre you sure? Type 'yes' to confirm.`,
                actionOnConfirm: () => {
                    this.chat.alterUserScore(new AlterUserScoreArgs(user, -estimatedWinnings, Plugin.NAME, `${Plugin.NAME}.additionalspin`));
                    this.statistics.alterBalance(estimatedWinnings);
                    return this.executeSpin(user);
                },
            };
        }

        this.sendMessage('The wheel is slowing down...', 5000);
        this.sendMessage('The wheel is coming to a stop...', 9000);
        setTimeout(() => {
            const winDescription = this.executeSpin(user);
            this.sendMessage(winDescription);
        }, 11000);

        this.lastSpin = new Date();

        return 'You give the wheel a mighty spin';
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
        this.allActions.push(...Mute.getMutes());
        this.allActions.push(...Nothing.getNothing());
        this.allActions.push(...PayForMessages.getPayForMessages());

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
        return `The wheel of fortune has the following items today:\n\n${this.wheel.map(e => `<b>${e.name}</b>\n${e.description}`).join('\n\n')}`;
    }

    /**
     * Handles score change events from the Plugin and triggers the correct subscribers.
     * @param args The score change event args.
     */
    public handleScoreChange(args: PreUserScoreChangedEventArguments) {
        if (this.scoreChangeMethods.has(args.user.id)) {
            const methods = this.scoreChangeMethods.get(args.user.id)!;
            for (const method of methods) {
                method(args);
            }
        }
    }

    /**
     * Handles message send events from the Plugin and triggers the correct subscribers.
     * @param args The message event args.
     */
    public handleChatMessage(args: ChatMessageEventArguments) {
        if (this.interceptMessageMethods.has(args.user.id) && args.msg.text) {
            const methods = this.interceptMessageMethods.get(args.user.id)!;
            for (const method of methods) {
                method(args);
            }
        }
    }

    /**
     * Clears expired actions from the claimed list
     */
    public clearOldWheelActions(): void {
        this.userClaimedActions = this.userClaimedActions.filter(x => !x.isExpired);
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

    public printUserAwards(user: User): string {
        const actions = this.userClaimedActions.filter(a => a.winner?.id === user.id);
        let message = `Current winnings and punishments for ${user.name}:\n`;
        for (const action of actions) {
            message += `- ${action.name} -- ${action.getLeftoverTime()} left\n`;
        }

        if (actions.length === 0) {
            message += 'None';
        }

        return message;
    }

    private executeSpin(user: User): string {
        const index = Math.floor(Math.random() * (this.wheel.length));
        const action = this.wheel[index];

        action.awardWinnings(this, user);
        if (action.needsReplacing(user)) {
            this.wheel.splice(index, 1);
            this.updateWheel(this.wheel);
        }

        this.userClaimedActions.push(action);

        this.statistics.spinMade();

        return this.getSpinDescription(action, user);
    }

    private updateWheel(wheel: WheelAction[]): void {
        const index = wheel.length;
        const destinationLength = Number(this.chat.getSetting(Plugin.SETTING_ITEMS_ON_WHEEL));
        const destinationFitness = -1;

        let currentWheelFitness = this.calculateWheelFitness(wheel);
        while (wheel.length < destinationLength || (currentWheelFitness < destinationFitness - 0.1 || currentWheelFitness > destinationFitness + 0.1)) {
            const newAction = this.getNewWheelAction();
            if (!wheel.map(a => a.category).includes(newAction.category) && this.statistics.getBalance() >= newAction.pointRequirement) {
                wheel.push(newAction);
            }

            if (wheel.length > destinationLength) {
                wheel.splice(index, 1);
            }

            currentWheelFitness = this.calculateWheelFitness(wheel);
        }

        Util.shuffle(wheel);
    }

    private getSpinDescription(action: WheelAction, user: User): string {
        const light = action.priceQuality > 0 ? '🟢' : action.priceQuality === 0 ? '🔵' : '🔴';

        let message = light.repeat(10);
        message += `\n\n${action.name.toUpperCase()}\n\n${action.description}\n\n`;
        message += light.repeat(10);
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
        return actions.map(a => a.priceQuality).reduce((v, total) => total + v, 0) / actions.length;
    }

    private getNewWheelAction(): WheelAction {
        return this.allActions[Math.floor(Math.random() * this.allActions.length)];
    }
}