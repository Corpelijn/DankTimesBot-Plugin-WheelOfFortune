import { User } from "../../../src/chat/user/user";
import { PreUserScoreChangedEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/pre-user-score-changed-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class ExtraCosts extends WheelAction {
    constructor(private extraCost: number) {
        super();
    }

    public name: string = `Extra costs ${this.extraCost}`;
    public description: string = `Anytime you win or loose any points, you pay ${this.extraCost} points as a service fee.`;
    public category: string = `extracost${this.extraCost}`;
    public priceQuality: number = -1;

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeScoreChange(user, (args) => this.onScoreChange(manager, args));
    }

    public getEstimatedPrice(): number {
        return -this.extraCost * 10;
    }

    public static getExtraCosts(): WheelAction[] {
        const actions = new Array<WheelAction>();
        const numbers = [5, 10, 15];
        for (const number of numbers) {
            actions.push(new ExtraCosts(number));
        }

        return actions;
    }

    private onScoreChange(manager: ChatManager, args: PreUserScoreChangedEventArguments) {
        if (!args.immutable) {
            // Subtract the costs from the awarded or losing points
            args.changeInScore -= this.extraCost;
            // Add the taken points to the balance
            manager.getStatistics().alterBalance(this.extraCost);
        }
    }
}