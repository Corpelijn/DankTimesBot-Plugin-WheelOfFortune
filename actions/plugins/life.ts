import { Chat } from "../../../../src/chat/chat";
import { User } from "../../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { ChatManager } from "../../chat-manager";
import { WheelAction } from "../../wheel-action";


export class Life {
    public static readonly PLUGIN_NAME = 'Life';
    public static readonly PLUGIN_COMMANDS = ['life', 'status', 'work', 'hustle', 'huts', 'hutsle', 'breakout', 'office', 'prison', 'bribe', 'hospital', 'bounties', 'placebounty', 'kill'];

    public static getLife(chat: Chat): WheelAction[] {
        if (!chat.pluginhost.plugins.map(p => p.name).includes(Life.PLUGIN_NAME)) {
            return [];
        }

        const actions = new Array<WheelAction>();
        const costNumbers = [5, 10, 15];
        for (const number of costNumbers) {
            actions.push(new LifeCosts(number));
        }

        return actions;
    }
}

export class LifeCosts extends WheelAction {

    constructor(private costs: number) {
        super();
    }

    public name: string = `${Life.PLUGIN_NAME} costs ${this.costs}`;
    public description: string = `Using the ${Life.PLUGIN_NAME} plugin will cost ${this.costs} points.`;
    public category: string = 'life';
    public priceQuality: number = -1;

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeMessagePost(this, args => this.onPostMessage(manager, user, args));
    }

    public getEstimatedPrice(user: User): number {
        return this.costs * 100;
    }

    private onPostMessage(manager: ChatManager, user: User, args: ChatMessageEventArguments) {
        // If the text message contains any of the commands from the plugin, reduce the points of the user
        if (Life.PLUGIN_COMMANDS.some(c => args.msg.text?.trim().startsWith(`/${c}`)) && !this.isExpired) {
            // Take the poins away from the user
            manager.reducePoints(this.costs, user);

            // Add the points to the balance
            manager.getStatistics().alterBalance(this.costs);
        }
    }
}