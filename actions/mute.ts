import { User } from "../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { ChatManager } from "../chat-manager";
import { WheelAction } from "../wheel-action";

export class Mute extends WheelAction {

    private lastMessageTimestamps: number[] = [];
    private static readonly SECONDS_PER_MINUTE = 60;

    constructor(private messages: number, private minutes: number) {
        super();
    }

    public name: string = `Mute to ${this.messages} per ${this.minutes}`;
    public description: string = `Limits you to only send ${this.messages} message(s) per ${this.minutes} minute(s)`;
    public category: string = 'mute';
    public priceQuality: number = -3;

    protected handleWinnings(manager: ChatManager, user: User): void {
        manager.subscribeMessagePost(this, (args) => this.onChatMessage(manager, args));
    }

    public getEstimatedPrice(user: User): number {
        return 0;
    }

    public static getMutes(): WheelAction[] {
        const messagesPerMinute = 5;
        const minutes = [1, 2, 3];

        const actions: WheelAction[] = [];
        for (const minute of minutes) {
            actions.push(new Mute(Math.max(10, minute * messagesPerMinute), minute));
        }

        return actions;
    }

    private onChatMessage(manager: ChatManager, args: ChatMessageEventArguments) {
        if (this.isExpired) {
            return;
        }

        const messageTimestamp = args.msg.date;
        const lowestLastMessageTimestamp = Math.min(...this.lastMessageTimestamps);

        // Check if the user has exceeded their allowed minutes and message count
        if (lowestLastMessageTimestamp + (Mute.SECONDS_PER_MINUTE * this.minutes) > messageTimestamp && this.lastMessageTimestamps.length === this.messages) {
            // Remove the message
            manager.removeMessage(args.msg.message_id);
        } else {
            // If the user is not over the allowed messages, add the message timestamp to the known timestamps;
            this.lastMessageTimestamps.push(messageTimestamp);
            if (this.lastMessageTimestamps.length > this.messages) {
                this.lastMessageTimestamps.splice(0, 1);
            }
        }
    }
}