import { User } from "../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";


export class PayForMessages extends WheelAction {

    constructor(private costs: number) {
        super();
    }

    public name: string = `Pay for everything ${this.costs}`;
    public description: string = `When you send a message in the chat, it will cost you ${this.costs} points.`;
    public category: string = `payformessages`;
    public priceQuality: number = -3 - (this.costs * 0.5);

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeMessagePost(this, () => this.onPostMessage(manager, user));
    }

    public getEstimatedPrice(user: User): number {
        return -this.costs * 200;
    }

    public static getPayForMessages(): WheelAction[] {
        const numbers = [1, 2];
        const actions: WheelAction[] = [];
        for (const number of numbers) {
            actions.push(new PayForMessages(number));
        }

        return actions;
    }

    private onPostMessage(manager: ChatManager, user: User) {
        if (!this.isExpired) {
            // Take the points from the user
            manager.reducePoints(this.costs, user);

            // Add the points back to the balance
            manager.getStatistics().alterBalance(this.costs);
        }
    }
}