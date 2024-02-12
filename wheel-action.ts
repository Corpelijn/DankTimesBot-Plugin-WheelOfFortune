import { User } from "../../src/chat/user/user";
import { ChatManager } from "./chat-manager";
import { Plugin } from './plugin';

export abstract class WheelAction {

    private static readonly HOURS_TO_MILLISECONDS = 60 * 60 * 1000;
    private static readonly MINUTES_TO_MILLISECONDS = 60 * 1000;
    private _expireTime: Date;

    constructor() {
        this._expireTime = new Date();
    }

    public abstract name: string;
    public abstract description: string;
    public abstract category: string;
    public abstract priceQuality: number;

    public winner: User | null;

    public get pointRequirement(): number { return 0; }

    public awardWinnings(manager: ChatManager, user: User): void {
        this.winner = user;
        const durationInHours = Number(manager.chat.getSetting(Plugin.SETTING_AWARD_DURATION));
        this._expireTime.setTime(new Date().getTime() + (durationInHours * 60 * 60 * 1000));

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
        const leftoverMs = this._expireTime.getTime() - new Date().getTime()
        const hours = Math.floor(leftoverMs / WheelAction.HOURS_TO_MILLISECONDS);
        const minutes = Math.ceil(leftoverMs / WheelAction.MINUTES_TO_MILLISECONDS);

        if (hours > 0) {
            return `${hours} hour(s)`;
        } else {
            return `${minutes} minute(s)`;
        }
    }
}