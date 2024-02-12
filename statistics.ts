
export class Statistics {

    private chats = new Map<number, ChatStatistics>();

    public load(chats: ChatStatistics[]): void {
        this.chats = new Map<number, ChatStatistics>();
        for (const chat of chats) {
            this.chats.set(chat.chatId, ChatStatistics.copy(chat));
        }
    }

    public getChats(): ChatStatistics[] {
        return Array.from(this.chats.values());
    }

    public getChat(chatId: number): ChatStatistics {
        if (this.chats.has(chatId)) {
            return this.chats.get(chatId)!;
        }

        const chat = new ChatStatistics(chatId);
        this.chats.set(chatId, chat);
        return chat;
    }
}

export class ChatStatistics {
    private balance: number;
    private spins: number;

    constructor(public chatId: number) {
        this.balance = 0;
        this.spins = 0;
    }

    public reset(): void {
        this.balance = 0;
        this.spins = 0;
    }

    public alterBalance(amount: number): void {
        this.balance += amount;
    }

    public getBalance() : number {
        return this.balance;
    }

    public spinMade(): void {
        this.spins += 1;
    }

    public print(): string {
        return `Wheel of Fortune --- Statistics\n\nBalance: ${this.balance}\nSpins: ${this.spins}`;
    }

    public static copy(chat: ChatStatistics) : ChatStatistics {
        const statistics = new ChatStatistics(chat.chatId);
        statistics.balance = chat.balance;
        statistics.spins = chat.spins;
        return statistics;
    }
}