import { User } from "../../../src/chat/user/user";
import { PreUserScoreChangedEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/pre-user-score-changed-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class CappedGains extends WheelAction {
    
    constructor(private number: number) {
        super();
    }

    public name: string = `Capped to ${this.number}`;
    public description: string = `Everytime you win/gain points greater than ${this.number} points, you only receive ${this.number} points.`;
    public category: string = `capped${this.number}`;
    public priceQuality: number = -1;

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeScoreChange(user, args => this.onScoreChange(manager, args));
    }

    public getEstimatedPrice(): number {
        return this.number * 50;
    }

    public static getCappedGains(): WheelAction[] {
        const actions = new Array<WheelAction>();
        const numbers = [1, 5, 10];
        for (const number of numbers) {
            actions.push(new CappedGains(number));
        }

        return actions;
    }

    private onScoreChange(manager: ChatManager, args: PreUserScoreChangedEventArguments) {
        // Check if the user is winning points or losing points, and if the user is winning more than the capped amount
        if(args.changeInScore > this.number) {
            // Calculate the "leftover" points that we can add to the balance
            const leftover = args.changeInScore - this.number;

            // Cap the points that the user is receiving
            args.changeInScore = this.number;

            // Add the leftover points to the balance
            manager.getStatistics().alterBalance(leftover);
        }        
    }
}