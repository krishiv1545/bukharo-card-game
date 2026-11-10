export type Suit = "S" | "H" | "D" | "C";
export interface CardT { id: string; rank: number; suit: Suit; deck: number }
export interface PlayerV { id: string; team: string; hand_count: number; opened: boolean; claimed_sets: number[]; presses: number }
export interface ComboV { id: string; team: string; creator: string; kind: "sequence" | "set"; cards: CardT[]; wild_ids: string[]; closed: boolean }
export interface SetV { index: number; status: "available" | "claimed"; claimed_by: string | null }
export interface Breakdown {
  laid_points: number; clean_sevens: number; dirty_sevens: number; seven_aces: number;
  press_downs: number; hand_penalty: number; total: number;
}
export interface GameV {
  phase: "draw" | "play" | "over"; current: string; players: PlayerV[]; my_hand: CardT[];
  draw_count: number; discard: CardT[]; sets: SetV[]; combos: ComboV[];
  result: Record<string, Breakdown> | null; version: number;
}
export interface MemberV { username: string; ready: boolean; team: string }
export interface RoomV { code: string; status: "lobby" | "playing" | "finished"; host: string; config: Record<string, unknown>; members: MemberV[] }
export interface StateMsg { type: "STATE"; room: RoomV; game: GameV | null }
export interface ChatMsg { from: string; text: string; at: number }
