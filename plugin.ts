import { BotCommand } from "../../src/bot-commands/bot-command";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Util } from "../../src/util/util";
import { Chat } from "../../src/chat/chat";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { ChatManager } from "./chat-manager";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { BotCommandConfirmationQuestion } from "../../src/bot-commands/bot-command-confirmation-question";
import { PreUserScoreChangedEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/pre-user-score-changed-event-arguments";
import { EmptyEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/empty-event-arguments";
import { ChatStatistics, Statistics } from "./statistics";
import { ChatResetEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-reset-event-arguments";

export class Plugin extends AbstractPlugin {
    // Commands
    public static readonly STATS_CMD = ["wofstatistics", "wofstat", "wofstats"];
    public static readonly INFO_CMD = ["wheeloffortune", "wofinfo"];
    public static readonly SPIN_CMD = ['wof', 'wofspin'];
    public static readonly EXPLAIN_CMD = ['wofexplain', 'wofex'];
    public static readonly CURRENT_CMD = ['wofcurrent', 'wofcur'];

    // Settings
    public static readonly SETTING_ITEMS_ON_WHEEL = 'wheeloffortune.wheelitemcount';
    public static readonly SETTING_INTERVAL_BETWEEN_SPINS = 'wheeloffortune.interval';
    public static readonly SETTING_AWARD_DURATION = 'wheeloffortune.punishmentduration';
    public static readonly FILE_STORAGE = "wheeloffortune.json";

    public static readonly NAME = 'wheeloffortune';

    private _chats = new Map<number, ChatManager>();
    private _statistics = new Statistics();
    private _util = new Util();

    constructor() {
        super("Wheel of Fortune Plugin", "1.0.1")

        this.subscribeToPluginEvent(PluginEvent.ChatReset, this.onChatReset.bind(this));
        this.subscribeToPluginEvent(PluginEvent.HourlyTick, this.onHourlyTick.bind(this));
        this.subscribeToPluginEvent(PluginEvent.ChatMessage, this.onChatMessageReceived.bind(this));
        this.subscribeToPluginEvent(PluginEvent.PreUserScoreChange, this.onPreUserScoreChange.bind(this));
        this.subscribeToPluginEvent(PluginEvent.BotShutdown, this.onShutdown.bind(this));
        this.subscribeToPluginEvent(PluginEvent.BotStartup, this.onStartup.bind(this));
        this.subscribeToPluginEvent(PluginEvent.NightlyUpdate, this.onNightlyUpdate.bind(this));
    }

    /**
     * @override
     */
    public getPluginSpecificChatSettings(): Array<ChatSettingTemplate<any>> {
        return [
            new ChatSettingTemplate(Plugin.SETTING_ITEMS_ON_WHEEL, 'Sets the amount of items on the wheel.', 7, (original) => Number(original), (value) => { if (value < 3 || value > 10) throw new Error('Values must be between 3 and 10'); }),
            new ChatSettingTemplate(Plugin.SETTING_INTERVAL_BETWEEN_SPINS, 'Sets the interval betweens spins of the wheel in minutes.', 5, (original) => Number(original), (value) => { if (value < 0 || value > 600) throw new Error('Values must be between 0 and 600'); }),
            new ChatSettingTemplate(Plugin.SETTING_AWARD_DURATION, 'Sets the duration of the award in hours.', 24, (original) => Number(original), (value) => { if (value < 1 || value > 48) throw new Error('Values must be between 1 and 48'); }),
        ];
    }

    /**
     * @override
     */
    public getPluginSpecificCommands(): BotCommand[] {
        return [
            new BotCommand(Plugin.SPIN_CMD, "spins the Wheel of Fortune", this.spin.bind(this), true),
            new BotCommand(Plugin.EXPLAIN_CMD, "explains the items of the Wheel of Fortune", this.explain.bind(this), true),
            new BotCommand(Plugin.INFO_CMD, "prints information about the Wheel of Fortune", this.info.bind(this), true),
            new BotCommand(Plugin.STATS_CMD, "shows the statistics of the plugin", this.stats.bind(this), true),
            new BotCommand(Plugin.CURRENT_CMD, "shows the current winnings and punishments", this.currentWinningsAndPunishments.bind(this), true),

            //new BotCommand(['give'], '', this._give.bind(this), false),
        ];
    }

    /** FOR DEBUGGING ONLY */
    private _give(chat: Chat, user: User) {
        chat.alterUserScore(new AlterUserScoreArgs(user, 1000, 'test', ''));
        return ``;
    }

    public async sendTextMessage(chatId: number, message: string): Promise<void> {
        await this.telegramBotClient.sendMessage(chatId, message, { parse_mode: "HTML" });
    }

    public async removeMessage(chatId: number, messageId: number): Promise<void> {
        await this.telegramBotClient.deleteMessage(chatId, messageId.toString());
    }

    private info(): any {
        return `Welcome to The Wheel of Fortune\n\n` +

            `/${Plugin.SPIN_CMD[0]} to spin the wheel\n` +
            `/${Plugin.EXPLAIN_CMD[0]} to show the items that are currently on the wheel\n` +
            `/${Plugin.STATS_CMD[0]} to show the balance and statistics of the wheel\n` +
            `/${Plugin.CURRENT_CMD[0]} to show your winnings and punishments`;
    }

    private spin(chat: Chat, user: User): string | BotCommandConfirmationQuestion {
        return this.getChatManager(chat)!.spin(user);
    }

    private explain(chat: Chat): any {
        return this.getChatManager(chat)!.explainWheel();
    }

    private stats(chat: Chat): any {
        return this._statistics.getChat(chat.id)?.print();
    }

    private currentWinningsAndPunishments(chat: Chat, user: User): any {
        return this.getChatManager(chat)!.printUserAwards(user);
    }

    private onChatReset(args: ChatResetEventArguments): any {
        const statistics = this._statistics.getChat(args.chat.id);
        this.sendTextMessage(args.chat.id, `Statistics before the reset:\n${statistics.print()}`);
        statistics.reset();
    }

    private onHourlyTick(args: EmptyEventArguments): any {
        for (const chat of this._chats.values()) {
            chat.clearOldWheelActions();
        }
    }

    public onPreUserScoreChange(args: PreUserScoreChangedEventArguments): any {
        this.getChatManager(args.chat)!.handleScoreChange(args);
    }

    private onShutdown() {
        this.saveDataToFile(Plugin.FILE_STORAGE, this._statistics.getChats());
    }

    private onStartup() {
        const chats = this.loadDataFromFile(Plugin.FILE_STORAGE) as ChatStatistics[];
        if (chats) {
            this._statistics.load(chats);
        }
    }

    private onNightlyUpdate() {
        for(const chat of this._chats.values()) {
            chat.clearAndGenerateWheel();
        }
    }

    private onChatMessageReceived(args: ChatMessageEventArguments) {
        const chat = this.getChatManager(args.chat)!;
        chat.handleChatMessage(args);
    }

    private getChatManager(chat: Chat) {
        if (this._chats.has(chat.id)) {
            return this._chats.get(chat.id);
        } else {
            const statistics = this._statistics.getChat(chat.id);
            const chatManager = new ChatManager(chat, this, statistics);
            chatManager.clearAndGenerateWheel();
            this._chats.set(chat.id, chatManager);
            return chatManager;
        }
    }
}
