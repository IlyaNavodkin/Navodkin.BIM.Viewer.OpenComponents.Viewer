declare module "stats.js" {
  export default class Stats {
    REVISION: number;
    dom: HTMLDivElement;

    showPanel(id: number): void;
    begin(): void;
    end(): number;
    update(): void;
  }
}
