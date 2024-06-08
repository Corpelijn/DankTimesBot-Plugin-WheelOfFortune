import { User } from "../../src/chat/user/user";
import { ChatManager } from "./chat-manager";
import { Plugin } from './plugin';
import { Util } from "./util";

export abstract class WheelAction {

    private _expireTime: Date;
    
    constructor() {
        this._expireTime = new Date();
        const durations = [1, 2, 3, 4, 6, 8, 12, 16];
        this.durationInHours = durations[Math.floor(Math.random() * durations.length)];
    }
    
    public abstract name: string;
    public abstract description: string;
    public abstract category: string;
    public abstract priceQuality: number;
    
    public winner: User | null;
    public winTime: Date | null;
    public durationInHours: number;
    
    public get pointRequirement(): number { return 0; }
    
    public get title(): string {
        return `<b>${this.name}</b> -- <i>${Util.getTimeDescription(this.durationInHours * Util.HOURS_TO_MILLISECONDS)}</i>`;
    }

    public get lightIcon(): string {
        return this.priceQuality > 0 ? '🟢' : this.priceQuality === 0 ? '🔵' : '🔴';
    }

    public awardWinnings(manager: ChatManager, user: User): void {
        this.winner = user;        
        this.winTime = new Date();

        this._expireTime.setTime(new Date().getTime() + (this.durationInHours * Util.HOURS_TO_MILLISECONDS));

        this.handleWinnings(manager, user);
    }

    protected abstract handleWinnings(manager: ChatManager, user: User): void;
    public abstract getEstimatedPrice(user: User): number;

    public needsReplacing(user: User): boolean {
        return true;
    }

    public get isExpired(): boolean {
        return this._expireTime < new Date();
    }

    public getLeftoverTime(): string {
        return Util.getTimeDifferenceDescription(this._expireTime);
    }
}