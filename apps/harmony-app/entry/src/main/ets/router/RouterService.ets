/**
 * Router 单例：包装 NavPathStack。
 * - 全局只有一个 stack，存在 AppStorage（key="globalNavStack"）以便子页拿到
 * - 提供 push / replace / pop / popToRoot 4 个动作
 */
export class RouterService {
  private static stack: NavPathStack | null = null;

  static bind(stack: NavPathStack): void {
    RouterService.stack = stack;
    AppStorage.SetOrCreate<NavPathStack>('globalNavStack', stack);
  }

  static get(): NavPathStack {
    if (!RouterService.stack) {
      const fromStorage = AppStorage.Get<NavPathStack>('globalNavStack');
      if (fromStorage) {
        RouterService.stack = fromStorage;
      } else {
        RouterService.stack = new NavPathStack();
      }
    }
    return RouterService.stack;
  }

  static push(name: string, param?: object): void {
    RouterService.get().pushPathByName(name, param ?? null);
  }

  static replace(name: string, param?: object): void {
    const s = RouterService.get();
    s.replacePathByName(name, param ?? null);
  }

  static pop(): void {
    RouterService.get().pop();
  }

  static popToRoot(): void {
    RouterService.get().clear();
  }
}
