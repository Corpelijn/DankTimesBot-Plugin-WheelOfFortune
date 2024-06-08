
export class Util {
    public static readonly HOURS_TO_MILLISECONDS = 60 * 60 * 1000;
    public static readonly MINUTES_TO_MILLISECONDS = 60 * 1000;
    public static readonly HOURS_TO_MINUTES = 60;

    public static shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    };

    public static inRange(value: number, target: number, delta: number): boolean {
        return value < target + delta && value > target - delta;
    }

    public static getTimeDifferenceDescription(time: Date): string {
        const leftoverMs = time.getTime() - new Date().getTime()
        return this.getTimeDescription(leftoverMs);
    }

    public static getTimeDescription(durationInMs: number): string {
        let hours = Math.floor(durationInMs / Util.HOURS_TO_MILLISECONDS);
        let minutes = Math.ceil(durationInMs / Util.MINUTES_TO_MILLISECONDS) - (hours * Util.HOURS_TO_MINUTES);

        if(minutes === 60) {
            minutes = 0;
            hours += 1;
        }

        let message = '';
        if (hours > 0) {
            message += `${hours} hour(s)`;
        }
        if (hours > 0 && minutes > 0) {
            message += ' and ';
        }
        if (minutes > 0) {
            message += `${minutes} minute(s)`;
        }
        return message;
    }
}