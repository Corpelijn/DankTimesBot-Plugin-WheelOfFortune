import { AlterUserScoreArgs } from "../../../src/chat/alter-user-score-args";
import { Chat } from "../../../src/chat/chat";
import { CoreSettingsNames } from "../../../src/chat/settings/core-settings-names";
import { User } from "../../../src/chat/user/user";
import { PreUserScoreChangedEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/pre-user-score-changed-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class DanktimeMultiplier extends WheelAction {

    private multiplierMap = new Map<number, string>([
        [2, "Double"], [3, "Triple"], [4, "Quadruple"]
    ]);
    private avgDankTimeGains: number;

    constructor(chat: Chat, private multiplier: number) {
        super();

        const randomtime = chat.getSetting(CoreSettingsNames.randomtimesPoints) as number;
        const danktime = chat.dankTimes.map(dt => dt.getPoints()).reduce((total, v) => total += v, 0);

        const randomCount = chat.getSetting(CoreSettingsNames.randomtimesFrequency) as number;
        this.avgDankTimeGains = (danktime + (randomtime * randomCount)) / (chat.dankTimes.length + randomCount);
    }

    public name: string = `${this.multiplierMap.get(this.multiplier)} danktime`;
    public description: string = `${this.multiplierMap.get(this.multiplier)} the points gained by any danktime.`;
    public category: string = 'danktime';
    public priceQuality: number = 1;

    public handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeScoreChange(user, (args) => this.onScoreChange(manager, args));
    }

    public getEstimatedPrice(user: User): number {
        return this.avgDankTimeGains * this.multiplier * 5;
    }

    public static getDankTimeMultiplier(chat: Chat): WheelAction[] {
        return [
            new DanktimeMultiplier(chat, 2),
            new DanktimeMultiplier(chat, 3),
            new DanktimeMultiplier(chat, 4)
        ];
    }

    private onScoreChange(manager: ChatManager, args: PreUserScoreChangedEventArguments) {
        // Check if the score change is from scoring a danktime
        if (args.reason === 'normal.danktime' || args.reason === 'random.danktime') {
            // Calculate the amount of points that need to be payed from the balance
            const payment = (args.changeInScore * this.multiplier) - args.changeInScore;
            
            // Add the multiplier to the user score
            args.changeInScore *= this.multiplier;

            // Remove the payment costs from the balance
            manager.getStatistics().alterBalance(-payment);
        }
    }
}   