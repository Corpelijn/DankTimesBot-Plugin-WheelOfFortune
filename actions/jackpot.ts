import { User } from "../../../src/chat/user/user";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class Jackpot extends WheelAction {

    constructor(private price: number) {
        super();
    }

    public name: string = `Jackpot ${this.price}`;
    public description: string = `You win ${this.price} points!`;
    public category: string = 'jackpot';
    public priceQuality: number = 2;

    override get pointRequirement(): number {
        return this.price;
    }

    public handleWinnings(manager: ChatManager, user: User): void {
        // Reward the jackpot points to the user
        manager.rewardPoints(this.price, user);
        // Remove the jackpot points from the balance
        manager.getStatistics().alterBalance(-this.price);
    }

    public getEstimatedPrice(): number {
        return this.price;
    }

    public static getJackpots(userScoreMedian: number): WheelAction[] {
        const multiplier = userScoreMedian < 100 ? 10 : 100;
        const values = new Array<number>();
        for (let i = 0; i < 10; i++) {
            values.push(Math.ceil((Math.random() * userScoreMedian / 4) / 100) * multiplier);
        }

        const actions = new Array<WheelAction>();
        for (const value of Array.from(new Set(values))) {
            actions.push(new Jackpot(value));
        }

        return actions;
    }
}