import { User } from "../../../src/chat/user/user";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class Equalizer extends WheelAction {

    constructor(private user: User) {
        super();
    }

    public name: string = `Equalizer ${this.user.name}`;
    public description: string = `Gives you enough points to be almost equal to ${this.user.name}'s points.`;
    public category: string = 'equalizer';
    public priceQuality: number = 2;

    public get pointRequirement(): number {
        return this.user.score;
    }

    public handleWinnings(manager: ChatManager, user: User): void {
        if (this.user.id === user.id) {
            manager.sendMessage(`You already have these points.\nYou win NOTHING.`);
        } else if (this.user.score < user.score) {
            manager.sendMessage(`You already have more points than ${this.user.name}.\nYou win NOTHING`);
        } else {

            // Calculate the amount the user is going to win
            const winnings = Math.max(0, this.user.score - user.score - 1);
            // Reward the points to the user
            manager.rewardPoints(winnings, user);
            // Notify the user of the amount they have won
            manager.sendMessage(`You win ${winnings} points.`);
            // Take the points from the balance
            manager.getStatistics().alterBalance(-winnings);
        }
    }

    public getEstimatedPrice(user: User): number {
        return Math.max(0, this.user.score - user.score);
    }

    public override needsReplacing(user: User): boolean {
        return user.id !== this.user.id;
    }

    public static getEqualizers(users: User[]): WheelAction[] {
        const actions = new Array<WheelAction>();
        for (const user of users) {
            actions.push(new Equalizer(user));
        }
        return actions;
    }
}