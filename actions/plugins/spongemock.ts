import { Chat } from "../../../../src/chat/chat";
import { User } from "../../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { ChatManager } from "../../chat-manager";
import { Util } from "../../util";
import { WheelAction } from "../../wheel-action";


export class SpongeMock {
    public static readonly PLUGIN_NAME = 'sPoNgEmOcK';
    public static readonly PLUGIN_COMMANDS = ["spongemock", "sm", "🧽", "spons", "miakomock", "mm", "🙏", "sneakyspongemock", "ssm", "💨🧽", "sneakymiakomock", "smm", "💨🙏"];

    public static getSpongeMock(chat: Chat): WheelAction[] {
        if (!chat.pluginhost.plugins.map(p => p.name).includes(SpongeMock.PLUGIN_NAME)) {
            return [];
        }

        const actions = new Array<WheelAction>();
        const costNumbers = [5, 10, 15, 20, 25];
        for (const number of costNumbers) {
            actions.push(new SpongeMockCosts(number));
        }

        const bonusNumbers = [1, 2, 3];
        for (const number of bonusNumbers) {
            actions.push(new SpongeMockBonus(number));
        }

        return actions;
    }
}

export class SpongeMockCosts extends WheelAction {

    constructor(private costs: number) {
        super();
    }

    public name: string = `${SpongeMock.PLUGIN_NAME} costs ${this.costs}`;
    public description: string = `Using the ${SpongeMock.PLUGIN_NAME} plugin will cost ${this.costs} points.`;
    public category: string = 'spongemock';
    public priceQuality: number = -0.5;

    public handleWinnings(manager: ChatManager, user: User): undefined {
        manager.subscribeMessagePost(user, args => this.onPostMessage(manager, user, args));
    }

    public getEstimatedPrice(): number {
        return -this.costs * 5;
    }

    private onPostMessage(manager: ChatManager, user: User, args: ChatMessageEventArguments) {
        // If the text message contains any of the commands from the plugin, reduce the points of the user
        if (SpongeMock.PLUGIN_COMMANDS.some(c => args.msg.text?.trim().startsWith(`/${c}`))) {
            // Take the points from the user
            manager.reducePoints(this.costs, user);

            // Add the points to the balance
            manager.getStatistics().alterBalance(this.costs);
        }
    }
}

export class SpongeMockBonus extends WheelAction {

    private lastPostedMessage = new Date();

    constructor(private bonus: number) {
        super();
    }

    public name: string = `${SpongeMock.PLUGIN_NAME} bonus ${this.bonus}`;
    public description: string = `Using the ${SpongeMock.PLUGIN_NAME} plugin will give you ${this.bonus} points every ${this.bonus} minutes.`;
    public category: string = 'spongemock';
    public priceQuality: number = 1;

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeMessagePost(user, args => this.onPostMessage(manager, user, args));
    }

    public getEstimatedPrice(): number {
        return this.bonus * 50;
    }

    private onPostMessage(manager: ChatManager, user: User, args: ChatMessageEventArguments) {
        // If the text message contains any of the commands from the plugin, reward the user with the points
        if (SpongeMock.PLUGIN_COMMANDS.some(c => args.msg.text?.trim().startsWith(`/${c}`))) {
            // Check if the timeout between messages has passed
            if (this.lastPostedMessage.getTime() + this.bonus * Util.MINUTES_TO_MILLISECONDS < new Date().getTime()) {
                // Reward the points to the user
                manager.rewardPoints(this.bonus, user);

                // Remove the points from the balance
                manager.getStatistics().alterBalance(-this.bonus);
            }

            // Update the last posted message time everytime a spongemock command is used.
            // This discourages spamming as the timer will reset every time.
            this.lastPostedMessage = new Date();
        }
    }
}