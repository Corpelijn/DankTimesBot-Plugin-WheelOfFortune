
export class Util {
    public static readonly MINUTES_TO_MILLISECONDS = 1000 * 60;
    
    public static shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length,  randomIndex;
    
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

    public static inRange(value: number, target: number, delta: number) : boolean {
        return value < target + delta && value > target - delta;
    }
}