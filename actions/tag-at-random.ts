import { User } from "../../../src/chat/user/user";
import { PreDankTimeEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/pre-dank-time-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class TagAtRandom extends WheelAction {

    private randomDankTimePoints = 0;
    private randomDankTimeFrequency = 0;

    constructor(private manager: ChatManager) {
        super();
        this.randomDankTimePoints = manager.chat.getRandomtimesPoints();
        this.randomDankTimeFrequency = manager.chat.randomtimesFrequency;
    }

    public name: string = 'Tag at random DankTime';
    public description: string = 'Tags you at the next random dank time';
    public category: string = 'tagrandom';
    public priceQuality: number = 0.5;

    protected handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeToDankTime(this, (args) => this.onDankTime(args));
    }

    public getEstimatedPrice(): number {
        return this.randomDankTimePoints * ((24 / this.randomDankTimeFrequency) / this.durationInHours);
    }

    public static getTagRandomDankTime(manager: ChatManager) {
        return [new TagAtRandom(manager)];
    }

    private onDankTime(args: PreDankTimeEventArguments) {
        if (args.dankTime.isRandom && !this.isExpired) {
            this.manager.sendMessage(`@${this.winner?.name}`, 0);
        }
    }
}