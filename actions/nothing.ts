import { User } from "../../../src/chat/user/user";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";


export class Nothing {
    
    public static getNothing() : WheelAction[] {
        return [new JustNothing(), new DoubleNothing(), new TripleNothing()];
    }
}

export class JustNothing extends WheelAction {
    public name: string = 'Nothing';
    public description: string = 'You win nothing';
    public category: string = 'nothing';
    public priceQuality: number = 0;

    protected handleWinnings(manager: ChatManager, user: User): void {
        // Do nothing
     }

    public getEstimatedPrice(user: User): number {
        return 0;
    }
}

export class DoubleNothing extends WheelAction {
    public name: string = 'Double Nothing';
    public description: string = 'Double nothing is still nothing. You win nothing';
    public category: string = 'nothing2';
    public priceQuality: number = 0;

    protected handleWinnings(manager: ChatManager, user: User): void {
        // Do nothing
     }

    public getEstimatedPrice(user: User): number {
        return 0;
    }
}

export class TripleNothing extends WheelAction {
    public name: string = 'Triple Nothing';
    public description: string = 'Triple nothing is still nothing. You win nothing';
    public category: string = 'nothing3';
    public priceQuality: number = 0;

    protected handleWinnings(manager: ChatManager, user: User): void {
        // Do nothing
     }

    public getEstimatedPrice(user: User): number {
        return 0;
    }
}