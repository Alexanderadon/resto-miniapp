import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "./types";

// cart-store использует persist(createJSONStorage(() => localStorage)).
// В node-среде localStorage нет — подставляем in-memory Storage ДО импорта стора
// (динамический import ниже, иначе хоистинг статического импорта обойдёт стаб).
function createLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const localStorageStub = createLocalStorageStub();
vi.stubGlobal("localStorage", localStorageStub);

const { useCartStore } = await import("./cart-store");

function makeItem(
  overrides: Partial<Omit<CartItem, "quantity">> = {},
): Omit<CartItem, "quantity"> {
  return {
    menuItemId: "id-1",
    slug: "plov",
    name: "Плов",
    priceTenge: 2400,
    imageUrl: null,
    ...overrides,
  };
}

beforeEach(() => {
  useCartStore.setState({ items: [] });
  localStorageStub.clear();
});

describe("addItem", () => {
  it("добавляет новую позицию с количеством 1 по умолчанию", () => {
    useCartStore.getState().addItem(makeItem());
    expect(useCartStore.getState().items).toEqual([
      { ...makeItem(), quantity: 1 },
    ]);
  });

  it("добавляет новую позицию с явным количеством", () => {
    useCartStore.getState().addItem(makeItem(), 3);
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
  });

  it("повторный addItem той же позиции мерджит количество, а не дублирует", () => {
    useCartStore.getState().addItem(makeItem(), 2);
    useCartStore.getState().addItem(makeItem(), 3);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(5);
  });

  it("при мердже обновляет поля позиции свежими данными (цена из меню)", () => {
    useCartStore.getState().addItem(makeItem({ priceTenge: 2400 }));
    useCartStore.getState().addItem(makeItem({ priceTenge: 2600 }));
    expect(useCartStore.getState().items[0]?.priceTenge).toBe(2600);
  });

  it("клэмпит количество новой позиции сверху на 20", () => {
    useCartStore.getState().addItem(makeItem(), 25);
    expect(useCartStore.getState().items[0]?.quantity).toBe(20);
  });

  it("клэмпит суммарное количество при мердже: 15 + 10 → 20", () => {
    useCartStore.getState().addItem(makeItem(), 15);
    useCartStore.getState().addItem(makeItem(), 10);
    expect(useCartStore.getState().items[0]?.quantity).toBe(20);
  });

  it("клэмпит снизу: qty 0 и отрицательное дают 1", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }), 0);
    useCartStore.getState().addItem(makeItem({ menuItemId: "b" }), -5);
    const items = useCartStore.getState().items;
    expect(items.map((i) => i.quantity)).toEqual([1, 1]);
  });

  it("дробное количество усекается до целого (2.9 → 2)", () => {
    useCartStore.getState().addItem(makeItem(), 2.9);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("разные menuItemId — отдельные позиции", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }));
    useCartStore.getState().addItem(makeItem({ menuItemId: "b" }));
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe("increment", () => {
  it("увеличивает количество на 1", () => {
    useCartStore.getState().addItem(makeItem(), 2);
    useCartStore.getState().increment("id-1");
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
  });

  it("на максимуме (20) остаётся 20", () => {
    useCartStore.getState().addItem(makeItem(), 20);
    useCartStore.getState().increment("id-1");
    expect(useCartStore.getState().items[0]?.quantity).toBe(20);
  });

  it("не трогает другие позиции и игнорирует неизвестный id", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }), 2);
    useCartStore.getState().increment("нет-такого");
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });
});

describe("decrement", () => {
  it("уменьшает количество на 1", () => {
    useCartStore.getState().addItem(makeItem(), 3);
    useCartStore.getState().decrement("id-1");
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("при количестве 1 удаляет позицию из корзины", () => {
    useCartStore.getState().addItem(makeItem(), 1);
    useCartStore.getState().decrement("id-1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("удаляет только целевую позицию, соседние сохраняются", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }), 1);
    useCartStore.getState().addItem(makeItem({ menuItemId: "b" }), 4);
    useCartStore.getState().decrement("a");
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.menuItemId).toBe("b");
    expect(items[0]?.quantity).toBe(4);
  });

  it("неизвестный id — состояние не меняется", () => {
    useCartStore.getState().addItem(makeItem(), 2);
    useCartStore.getState().decrement("нет-такого");
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });
});

describe("remove", () => {
  it("удаляет позицию независимо от количества", () => {
    useCartStore.getState().addItem(makeItem(), 7);
    useCartStore.getState().remove("id-1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("удаляет только указанную позицию", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }));
    useCartStore.getState().addItem(makeItem({ menuItemId: "b" }));
    useCartStore.getState().remove("a");
    expect(
      useCartStore.getState().items.map((i) => i.menuItemId),
    ).toEqual(["b"]);
  });
});

describe("clear", () => {
  it("опустошает корзину с несколькими позициями", () => {
    useCartStore.getState().addItem(makeItem({ menuItemId: "a" }), 3);
    useCartStore.getState().addItem(makeItem({ menuItemId: "b" }), 5);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe("persist", () => {
  it("изменения пишутся в localStorage под ключом aport-cart (version 1)", () => {
    useCartStore.getState().addItem(makeItem(), 2);
    const raw = localStorageStub.getItem("aport-cart");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      state: { items: CartItem[] };
      version: number;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.state.items).toEqual([{ ...makeItem(), quantity: 2 }]);
  });
});
