import { User } from "../../../src/chat/user/user";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class Jackpot extends WheelAction {

    constructor(protected price: number) {
        super();

        const durations = [6, 8, 12, 16];
        this.durationInHours = durations[Math.floor(Math.random() * durations.length)];
    }

    public name: string = `Jackpot ${this.price}`;
    public description: string = `You win ${this.price} points!`;
    public priceQuality: number = 2;
    
    override get category(): string {
        return 'jackpot';
    }

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

export class LowJackpot extends Jackpot {

    constructor(price: number) {
        super(price);
    }

    override get pointRequirement(): number {
        return 0;
    }

    override get category(): string {
        return `jackpot${this.price}`;
    }

    public static getJackpots(): WheelAction[] {
        const values = [25, 50, 75, 100, 125, 150];
        const actions = new Array<WheelAction>();
        for (const value of values) {
            actions.push(new LowJackpot(value));
        }

        return actions;
    }
}